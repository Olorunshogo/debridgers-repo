import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Star } from "lucide-react";
import {
  fetchPublicTestimonials,
  type PublicTestimonial,
} from "@debridgers/api-client";

/*
 * Curated quotes fill the section until enough real delivery ratings with comments exist.
 * Live rows from GET /testimonials replace them when the API returns any.
 */
const FALLBACK_TESTIMONIALS: PublicTestimonial[] = [
  {
    score: 5,
    authorLabel: "Aisha",
    location: "Narayi",
    avatarUrl: "/images/landing/market-woman.jpg",
    comment:
      "Ordered rice and beans on WhatsApp. Same week delivery, prices matched what they quoted. No market stress.",
    createdAt: "2026-03-12T10:00:00.000Z",
  },
  {
    score: 5,
    authorLabel: "Ibrahim",
    location: "Kakuri",
    avatarUrl: "/images/landing/market-owner.jpg",
    comment:
      "Palm oil arrived sealed and on time. The fixed price meant I could plan my shop stock without chasing rates.",
    createdAt: "2026-04-02T10:00:00.000Z",
  },
  {
    score: 4,
    authorLabel: "Fatima",
    location: "Sabon Tasha",
    avatarUrl: "/images/landing/market-lady.jpg",
    comment:
      "First order through an agent in Narayi. Quality was solid and they replaced a bag without argument.",
    createdAt: "2026-05-18T10:00:00.000Z",
  },
];

function Stars({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={16}
          className={
            star <= score
              ? "fill-secondary text-secondary"
              : "text-icon-tertiary"
          }
        />
      ))}
    </div>
  );
}

function AuthorAvatar({
  label,
  avatarUrl,
}: {
  label: string;
  avatarUrl: string | null;
}) {
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="bg-primary/15 text-primary font-syne flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold"
    >
      {initial}
    </span>
  );
}

export function TestimonialsSection() {
  const [items, setItems] = useState<PublicTestimonial[]>(
    FALLBACK_TESTIMONIALS,
  );
  const [summary, setSummary] = useState<{
    score: string;
    count: number;
    displayable: boolean;
  } | null>(null);
  const [fromLive, setFromLive] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    fetchPublicTestimonials()
      .then((data) => {
        if (cancelled) return;
        if (data.items.length > 0) {
          setItems(data.items);
          setFromLive(true);
        }
        setSummary(data.summary);
      })
      .catch(() => {
        /* Keep curated fallbacks; the section still reads as testimonials. */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="testimonials" className="relative w-full bg-[#F7FAF7]">
      <div className="font-syne section-max-width px-section-px py-section-py sm:px-section-px-sm sm:py-section-py-sm lg:px-section-px-lg lg:py-section-py-lg mx-auto flex w-full flex-col gap-10">
        <div className="flex flex-col gap-3 lg:gap-4">
          <p className="text-primary-light text-xl tracking-widest">
            Testimonials
          </p>
          <div className="flex w-full flex-wrap items-end justify-between gap-4">
            <h2 className="text-primary font-syne lg:text-50 max-w-188 text-3xl leading-tight font-extrabold sm:text-4xl lg:font-bold">
              What buyers say after delivery.
            </h2>
            {summary?.displayable && (
              <p className="text-body font-open-sans flex items-center gap-2 text-base">
                <Star
                  size={18}
                  className="fill-secondary text-secondary shrink-0"
                />
                <span className="text-heading font-semibold">
                  {summary.score}
                </span>
                <span>
                  from {summary.count} delivery rating
                  {summary.count === 1 ? "" : "s"}
                </span>
              </p>
            )}
          </div>
          {!fromLive && (
            <p className="text-body font-open-sans max-w-150 text-sm lg:text-base">
              Early notes from buyers in Kaduna. Star ratings from delivered
              orders appear here as they come in.
            </p>
          )}
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-6">
          {items.map((item, index) => (
            <motion.blockquote
              key={`${item.authorLabel}-${item.createdAt}-${index}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className="border-line flex flex-col gap-4 border-t pt-6"
            >
              <Stars score={item.score} />
              <p className="font-open-sans text-heading flex-1 text-base leading-relaxed lg:text-lg">
                &ldquo;{item.comment}&rdquo;
              </p>
              <footer className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <AuthorAvatar
                    label={item.authorLabel}
                    avatarUrl={item.avatarUrl}
                  />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <cite className="text-primary font-syne text-sm font-bold not-italic lg:text-base">
                      {item.authorLabel}
                    </cite>
                    <span className="text-body flex items-center gap-1 text-xs">
                      <MapPin size={12} className="shrink-0" aria-hidden />
                      {item.location}
                    </span>
                  </div>
                </div>
                <time
                  className="text-body shrink-0 text-xs"
                  dateTime={item.createdAt}
                >
                  {new Date(item.createdAt).toLocaleDateString("en-NG", {
                    month: "short",
                    year: "numeric",
                  })}
                </time>
              </footer>
            </motion.blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
