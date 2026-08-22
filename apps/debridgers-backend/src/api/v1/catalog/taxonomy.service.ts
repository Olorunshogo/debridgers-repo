import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, asc, eq, isNull } from "drizzle-orm";
import * as schema from "../../../infrastructure/persistence/index";
import { DATABASE_CONNECTION } from "../../../infrastructure/database/database.provider";

/*
 * Reads and writes the Category -> Type -> Variety tree.
 *
 * The tree is fetched in one query and assembled in memory rather than with a
 * recursive CTE or a query per level: the whole taxonomy is a few dozen rows, so
 * one round trip and a map is both faster and far easier to follow.
 */

export interface TaxonomyNode {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  children: TaxonomyNode[];
}

export interface CreateCategoryInput {
  name: string;
  parent_id?: number | null;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

@Injectable()
export class TaxonomyService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  // === Reads

  async getTree(opts: { activeOnly?: boolean } = {}): Promise<TaxonomyNode[]> {
    const rows = await this.db
      .select()
      .from(schema.product_categories)
      .where(
        opts.activeOnly
          ? eq(schema.product_categories.is_active, true)
          : undefined,
      )
      .orderBy(
        asc(schema.product_categories.sort_order),
        asc(schema.product_categories.name),
      );

    const byId = new Map<number, TaxonomyNode>();
    for (const row of rows) {
      byId.set(row.id, {
        id: row.id,
        name: row.name,
        slug: row.slug,
        parent_id: row.parent_id,
        description: row.description,
        image_url: row.image_url,
        sort_order: row.sort_order,
        is_active: row.is_active,
        children: [],
      });
    }

    const roots: TaxonomyNode[] = [];
    for (const node of byId.values()) {
      if (node.parent_id === null) {
        roots.push(node);
        continue;
      }
      const parent = byId.get(node.parent_id);
      /*
       * A node whose parent was filtered out by activeOnly is dropped rather
       * than promoted to a root: showing "Ofada" as a top-level category because
       * Rice was deactivated would misrepresent the catalogue.
       */
      if (parent) parent.children.push(node);
    }

    return roots;
  }

  async getTreeResponse(activeOnly = true) {
    return {
      message: "Categories retrieved",
      data: await this.getTree({ activeOnly }),
    };
  }

  /* Leaves are the only nodes a product may be attached to. Computed as "not a
     parent of any other node" so the set cannot drift from the table. */
  async getLeaves() {
    const rows = await this.db
      .select({
        id: schema.product_categories.id,
        name: schema.product_categories.name,
        slug: schema.product_categories.slug,
        parent_id: schema.product_categories.parent_id,
      })
      .from(schema.product_categories)
      .where(eq(schema.product_categories.is_active, true))
      .orderBy(asc(schema.product_categories.name));

    const parentIds = new Set(
      rows.map((r) => r.parent_id).filter((id): id is number => id !== null),
    );

    const tree = await this.getTree({ activeOnly: true });
    const pathById = new Map<number, string>();
    const walk = (node: TaxonomyNode, trail: string[]): void => {
      const path = [...trail, node.name];
      pathById.set(node.id, path.join(" > "));
      for (const child of node.children) walk(child, path);
    };
    for (const root of tree) walk(root, []);

    const leaves = rows
      .filter((r) => !parentIds.has(r.id))
      .map((r) => ({ ...r, path: pathById.get(r.id) ?? r.name }));

    return { message: "Category leaves retrieved", data: leaves };
  }

  /*
   * The top-level ancestor of a node, by name.
   *
   * The flat `products.category` column still drives the shop's filter chips, so
   * it has to stay populated even though the admin form now submits only a leaf
   * id. Deriving it here means one field to fill and no chance of the two
   * disagreeing.
   */
  async rootCategoryName(nodeId: number): Promise<string | null> {
    let currentId: number | null = nodeId;
    /* Bounded so a cycle from a bad parent_id cannot spin forever. */
    for (let hops = 0; currentId !== null && hops < 10; hops += 1) {
      const [row] = await this.db
        .select({
          name: schema.product_categories.name,
          parent_id: schema.product_categories.parent_id,
        })
        .from(schema.product_categories)
        .where(eq(schema.product_categories.id, currentId))
        .limit(1);

      if (!row) return null;
      if (row.parent_id === null) return row.name;
      currentId = row.parent_id;
    }
    return null;
  }

  /*
   * Display labels for every node, in one query.
   *
   * Two levels, because the shop needs two different things and a single string
   * cannot be both:
   *   category    - the root ancestor (Grains), which drives the filter chips
   *   subcategory - the immediate parent (Rice), which labels the product card
   *
   * A leaf directly under a root - Oil > Palm Oil - reports Oil for both, which
   * is correct: there is no intermediate level to name.
   *
   * Built as a map rather than resolved per product, so listing the catalogue
   * stays one query instead of one per row.
   */
  async categoryLabels(): Promise<
    Map<number, { category: string; subcategory: string }>
  > {
    const rows = await this.db
      .select({
        id: schema.product_categories.id,
        name: schema.product_categories.name,
        parent_id: schema.product_categories.parent_id,
      })
      .from(schema.product_categories);

    const byId = new Map(rows.map((r) => [r.id, r]));
    const labels = new Map<number, { category: string; subcategory: string }>();

    for (const row of rows) {
      const trail: string[] = [];
      let cursor: (typeof rows)[number] | undefined = row;

      /* Bounded so a cycle from a bad parent_id cannot spin forever. */
      for (let hops = 0; cursor && hops < 10; hops += 1) {
        trail.unshift(cursor.name);
        cursor = cursor.parent_id ? byId.get(cursor.parent_id) : undefined;
      }

      if (trail.length === 0) continue;

      labels.set(row.id, {
        category: trail[0],
        subcategory: trail.length > 1 ? trail[trail.length - 2] : trail[0],
      });
    }

    return labels;
  }

  // === Writes

  async createCategory(input: CreateCategoryInput) {
    const slug = slugify(input.name);
    if (!slug)
      throw new BadRequestException("Name must contain letters or digits");

    if (input.parent_id != null) {
      const [parent] = await this.db
        .select({ id: schema.product_categories.id })
        .from(schema.product_categories)
        .where(eq(schema.product_categories.id, input.parent_id))
        .limit(1);
      if (!parent) throw new NotFoundException("Parent category not found");
    }

    /*
     * Slugs are unique per parent, so the duplicate check has to be scoped the
     * same way. `isNull` rather than `eq(null)` because SQL equality against
     * NULL is never true and the check would silently pass for top-level rows.
     */
    const [clash] = await this.db
      .select({ id: schema.product_categories.id })
      .from(schema.product_categories)
      .where(
        and(
          eq(schema.product_categories.slug, slug),
          input.parent_id == null
            ? isNull(schema.product_categories.parent_id)
            : eq(schema.product_categories.parent_id, input.parent_id),
        ),
      )
      .limit(1);

    if (clash) {
      throw new BadRequestException(
        `"${input.name}" already exists under that parent.`,
      );
    }

    const [created] = await this.db
      .insert(schema.product_categories)
      .values({
        name: input.name.trim(),
        slug,
        parent_id: input.parent_id ?? null,
        description: input.description ?? null,
        image_url: input.image_url ?? null,
        sort_order: input.sort_order ?? 0,
      })
      .returning();

    return { message: "Category created", data: created };
  }

  async updateCategory(id: number, input: UpdateCategoryInput) {
    const [existing] = await this.db
      .select()
      .from(schema.product_categories)
      .where(eq(schema.product_categories.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException("Category not found");

    const updates: Partial<typeof schema.product_categories.$inferInsert> = {};
    if (input.name !== undefined) {
      updates.name = input.name.trim();
      updates.slug = slugify(input.name);
    }
    if (input.description !== undefined)
      updates.description = input.description;
    if (input.image_url !== undefined) updates.image_url = input.image_url;
    if (input.sort_order !== undefined) updates.sort_order = input.sort_order;
    if (input.is_active !== undefined) updates.is_active = input.is_active;

    const [updated] = await this.db
      .update(schema.product_categories)
      .set({ ...updates, updated_at: new Date() })
      .where(eq(schema.product_categories.id, id))
      .returning();

    return { message: "Category updated", data: updated };
  }

  /*
   * Deactivates rather than deletes. The row is referenced by products via
   * `category_id`, and a hard delete would cascade to every descendant and null
   * out those products' taxonomy in one click.
   */
  async deactivateCategory(id: number) {
    const [existing] = await this.db
      .select({ id: schema.product_categories.id })
      .from(schema.product_categories)
      .where(eq(schema.product_categories.id, id))
      .limit(1);

    if (!existing) throw new NotFoundException("Category not found");

    await this.db
      .update(schema.product_categories)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(schema.product_categories.id, id));

    return { message: "Category deactivated", data: null };
  }
}
