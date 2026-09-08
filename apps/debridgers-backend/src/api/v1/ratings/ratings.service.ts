import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, eq, isNull } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";
import { JwtPayload } from "../../../interfaces/users/jwt.type";
import {
  RATING_CONTEXTS,
  FACET_CATALOGUE_VERSION,
  contextsForRater,
  shrinkScore,
  weightedScore,
  isDisplayable,
  formatScore,
  tallyDistribution,
  type RatingContextConfig,
  type RatingContextKey,
  type RatingTargetType,
} from "@debridgers/ratings";
import type { SubmitRatingDto } from "./dto/submit-rating.dto";
import type { EditRatingDto } from "./dto/edit-rating.dto";
import type { DisputeRatingDto } from "./dto/dispute-rating.dto";

/*
 * Owns the authoritative score - callers, the frontend included, never send a computed number, only the raw per-target values a rater chose.
 * That is what keeps the score ungameable.
 * Every rule this service enforces (who may rate whom, whether an agent was involved, the edit window) mirrors the config in @debridgers/ratings, so the API cannot drift from what the client believes it is submitting.
 */
@Injectable()
export class RatingsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  private resolveContext(key: string): RatingContextConfig {
    const context = RATING_CONTEXTS[key as RatingContextKey];
    if (!context) {
      throw new BadRequestException(`Unknown rating context: ${key}`);
    }
    return context;
  }

  // === Submission

  async submitRating(user: JwtPayload, dto: SubmitRatingDto) {
    const context = this.resolveContext(dto.contextKey);

    if (context.raterRole !== user.role) {
      throw new ForbiddenException(
        `${dto.contextKey} is not rated by a ${user.role}`,
      );
    }

    const [order] = await this.db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, dto.orderId))
      .limit(1);

    if (!order) throw new NotFoundException("Order not found");

    const isParty =
      context.raterRole === "buyer"
        ? order.buyer_id === user.sub
        : order.agent_id === user.sub;
    if (!isParty) {
      throw new ForbiddenException("You were not party to this order");
    }

    if (order.status !== "delivered") {
      throw new BadRequestException("Only a delivered order can be rated");
    }

    if (context.requiresAgent && !order.agent_id) {
      throw new BadRequestException("This order had no agent attached to rate");
    }

    if (!order.delivered_at) {
      throw new BadRequestException("Order has no delivery date on record");
    }

    const editableUntil = addDays(order.delivered_at, context.windowDays);
    if (editableUntil < new Date()) {
      throw new BadRequestException("The window to rate this order has closed");
    }

    const target = context.targets[0];
    const { targetType, targetId } = resolveTarget(target.type, order);

    const [submission] = await this.db
      .insert(schema.ratingsSubmissions)
      .values({
        context_key: context.key,
        rater_role: context.raterRole,
        rater_id: user.sub,
        order_id: order.id,
        agent_id: order.agent_id,
        target_type: targetType,
        target_id: targetId,
        score: dto.score,
        facets: dto.facets,
        comment: dto.comment,
        facet_catalogue_version: FACET_CATALOGUE_VERSION,
        weight: context.weight,
        visibility_scope: targetType === "buyer" ? "admin_only" : "self",
        editable_until: editableUntil,
      })
      .onConflictDoNothing({
        target: [
          schema.ratingsSubmissions.order_id,
          schema.ratingsSubmissions.context_key,
          schema.ratingsSubmissions.rater_id,
        ],
      })
      .returning();

    if (!submission) {
      throw new BadRequestException("You already rated this");
    }

    return submission;
  }

  /*
   * Called once, from the single place that closes an order out as "delivered" (AdminService.updateOrderStatus).
   * Writes a real notification row per context that now applies, so a pending rating shows up in the same bell and the same unread count as everything else.
   * There is no separate pending-ratings inbox to keep in sync.
   */
  async notifyPendingOnDelivery(order: {
    id: number;
    buyer_id: number;
    agent_id: number | null;
  }): Promise<void> {
    const notifications: (typeof schema.notifications.$inferInsert)[] = [];

    for (const context of contextsForRater("buyer")) {
      if (context.requiresAgent && !order.agent_id) continue;
      notifications.push({
        user_id: order.buyer_id,
        type: "rating",
        title: context.title,
        description: context.description,
        read: false,
      });
    }

    if (order.agent_id) {
      for (const context of contextsForRater("agent")) {
        notifications.push({
          user_id: order.agent_id,
          type: "rating",
          title: context.title,
          description: context.description,
          read: false,
        });
      }
    }

    if (notifications.length > 0) {
      await this.db.insert(schema.notifications).values(notifications);
    }
  }

  // === Pending

  /** Every context this rater can still act on, across their delivered orders. */
  async listPending(user: JwtPayload) {
    if (user.role !== "buyer" && user.role !== "agent") return [];

    const candidates = contextsForRater(user.role);
    const partyColumn =
      user.role === "buyer" ? schema.orders.buyer_id : schema.orders.agent_id;

    const orders = await this.db
      .select()
      .from(schema.orders)
      .where(
        and(eq(partyColumn, user.sub), eq(schema.orders.status, "delivered")),
      );

    const submitted = await this.db
      .select({
        order_id: schema.ratingsSubmissions.order_id,
        context_key: schema.ratingsSubmissions.context_key,
      })
      .from(schema.ratingsSubmissions)
      .where(eq(schema.ratingsSubmissions.rater_id, user.sub));
    const submittedKeys = new Set(
      submitted.map((row) => `${row.order_id}:${row.context_key}`),
    );

    const now = new Date();
    const pending: Array<{
      orderId: number;
      contextKey: RatingContextKey;
      title: string;
      description: string;
      expiresAt: string;
    }> = [];

    for (const order of orders) {
      if (!order.delivered_at) continue;

      for (const context of candidates) {
        if (context.requiresAgent && !order.agent_id) continue;
        if (submittedKeys.has(`${order.id}:${context.key}`)) continue;

        const expiresAt = addDays(order.delivered_at, context.windowDays);
        if (expiresAt < now) continue;

        pending.push({
          orderId: order.id,
          contextKey: context.key,
          title: context.title,
          description: context.description,
          expiresAt: expiresAt.toISOString(),
        });
      }
    }

    return pending;
  }

  // === Editing and disputes

  async editRating(user: JwtPayload, ratingId: number, dto: EditRatingDto) {
    const submission = await this.getOwnedSubmission(ratingId, user.sub);

    if (submission.disputed) {
      throw new BadRequestException(
        "A disputed rating cannot be edited until it is resolved",
      );
    }
    if (submission.editable_until < new Date()) {
      throw new BadRequestException(
        "The edit window for this rating has closed",
      );
    }

    const [updated] = await this.db
      .update(schema.ratingsSubmissions)
      .set({
        score: dto.score ?? submission.score,
        facets: dto.facets ?? submission.facets,
        comment: dto.comment ?? submission.comment,
      })
      .where(eq(schema.ratingsSubmissions.id, ratingId))
      .returning();

    return updated;
  }

  /*
   * Raised by the person the rating is about, not the rater - an agent disputing a bad buyer-submitted rating, or a buyer disputing a bad agent-submitted one.
   * Excluded from aggregates until admin resolves it.
   */
  async disputeRating(
    user: JwtPayload,
    ratingId: number,
    _dto: DisputeRatingDto,
  ) {
    const [submission] = await this.db
      .select()
      .from(schema.ratingsSubmissions)
      .where(eq(schema.ratingsSubmissions.id, ratingId))
      .limit(1);

    if (!submission) throw new NotFoundException("Rating not found");

    if (submission.target_id !== user.sub) {
      throw new ForbiddenException("You are not the subject of this rating");
    }

    const [updated] = await this.db
      .update(schema.ratingsSubmissions)
      .set({ disputed: true })
      .where(eq(schema.ratingsSubmissions.id, ratingId))
      .returning();

    return updated;
  }

  private async getOwnedSubmission(ratingId: number, raterId: number) {
    const [submission] = await this.db
      .select()
      .from(schema.ratingsSubmissions)
      .where(
        and(
          eq(schema.ratingsSubmissions.id, ratingId),
          eq(schema.ratingsSubmissions.rater_id, raterId),
          isNull(schema.ratingsSubmissions.deleted_at),
        ),
      )
      .limit(1);

    if (!submission) throw new NotFoundException("Rating not found");
    return submission;
  }

  // === Aggregates

  async getTargetAggregate(
    targetType: string,
    targetId: number,
    requester: JwtPayload,
  ) {
    if (targetType !== "agent" && targetType !== "buyer") {
      throw new BadRequestException(
        "Aggregates are only available for agent and buyer targets",
      );
    }

    /* A buyer's own conduct score is internal; an agent may see their own. */
    const canView =
      requester.role === "admin" ||
      (targetType === "agent" &&
        requester.role === "agent" &&
        requester.sub === targetId);
    if (!canView) {
      throw new ForbiddenException(
        "You may not view this target's rating aggregate",
      );
    }

    const rows = await this.db
      .select({
        score: schema.ratingsSubmissions.score,
        weight: schema.ratingsSubmissions.weight,
      })
      .from(schema.ratingsSubmissions)
      .where(
        and(
          eq(schema.ratingsSubmissions.target_type, targetType),
          eq(schema.ratingsSubmissions.target_id, targetId),
          eq(schema.ratingsSubmissions.disputed, false),
          isNull(schema.ratingsSubmissions.deleted_at),
        ),
      );

    const weightedSum = rows.reduce(
      (total, row) => total + weightedScore(row.score, row.weight),
      0,
    );
    const weightedCount = rows.reduce((total, row) => total + row.weight, 0);
    const score = shrinkScore(weightedSum, weightedCount);

    return {
      targetType: targetType as RatingTargetType,
      targetId,
      count: rows.length,
      displayable: isDisplayable(rows.length),
      score: formatScore(score),
      distribution: tallyDistribution(rows.map((row) => row.score)),
      formulaVersion: 1,
    };
  }
}

// === Helpers

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function resolveTarget(
  type: RatingTargetType,
  order: typeof schema.orders.$inferSelect,
): { targetType: RatingTargetType; targetId: number | null } {
  if (type === "agent")
    return { targetType: "agent", targetId: order.agent_id };
  if (type === "buyer")
    return { targetType: "buyer", targetId: order.buyer_id };
  return { targetType: "delivery", targetId: null };
}
