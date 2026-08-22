import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { apiFetch, apiMutate } from "@debridgers/api-client";
import {
  Camera,
  CheckCircle,
  MapPin,
  User,
  Phone,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { motion } from "framer-motion";

export function meta() {
  return [
    { title: "Verify Delivery | Debridgers Admin" },
    { name: "robots", content: "noindex, nofollow" },
  ];
}

interface OrderDetails {
  id: number;
  order_reference: string;
  buyer_name: string;
  buyer_phone: string;
  delivery_address: string;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_verified_at?: string;
}

interface ApiOrderDetailsResponse {
  id: number;
  order_reference: string;
  buyer_name: string;
  buyer_phone: string;
  delivery_address: string;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_verified_at?: string;
}

export default function VerifyDelivery() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await apiFetch<ApiOrderDetailsResponse>(
          `/admin/deliveries/${orderId}`,
        );
        setOrder(data);
      } catch (_err) {
        setError("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos((prev) => [...prev, ...files]);

    // Create preview URLs
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrls((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      setError("Please upload at least one photo");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await apiMutate(`/admin/deliveries/${orderId}/verify`, {
        method: "POST",
        body: JSON.stringify({
          photos: photoUrls,
          notes,
          recipient_name: order?.buyer_name,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate("/dashboards/admin/deliveries");
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to verify delivery. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <div className="border-t-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200" />
          <p className="text-text">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto mb-3 text-red-500" />
          <p className="text-text font-semibold">Order not found</p>
          <button
            onClick={() => navigate("/dashboards/admin/deliveries")}
            className="text-primary mt-2 text-sm hover:underline"
          >
            Back to Deliveries
          </button>
        </div>
      </div>
    );
  }

  if (order.delivery_verified_at) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-center">
          <CheckCircle size={48} className="mx-auto mb-3 text-green-500" />
          <p className="text-text font-semibold">Delivery already verified</p>
          <p className="text-text mt-1 text-sm">
            Verified on{" "}
            {new Date(order.delivery_verified_at).toLocaleDateString("en-NG")}
          </p>
          <button
            onClick={() => navigate("/dashboards/admin/deliveries")}
            className="text-primary mt-3 text-sm hover:underline"
          >
            Back to Deliveries
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4"
        >
          <CheckCircle
            size={20}
            className="mt-0.5 flex-shrink-0 text-green-600"
          />
          <div>
            <p className="font-semibold text-green-900">
              Delivery verified successfully!
            </p>
            <p className="text-sm text-green-700">
              Redirecting to deliveries list...
            </p>
          </div>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle
            size={20}
            className="mt-0.5 flex-shrink-0 text-red-600"
          />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Order Summary */}
      <div className="border-gray-border mb-6 rounded-2xl border bg-white p-6">
        <h2 className="font-syne text-heading mb-4 text-lg font-bold">
          Order {order.order_reference}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <User size={18} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-text text-xs font-semibold uppercase">Buyer</p>
              <p className="text-heading font-semibold">{order.buyer_name}</p>
              <p className="text-text mt-1 flex items-center gap-1 text-sm">
                <Phone size={14} />
                {order.buyer_phone}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign
              size={18}
              className="text-primary mt-0.5 flex-shrink-0"
            />
            <div>
              <p className="text-text text-xs font-semibold uppercase">
                Amount
              </p>
              <p className="text-heading font-semibold">
                ₦{(order.amount / 100).toLocaleString()}
              </p>
              <p className="text-text mt-1 text-sm">
                Status:{" "}
                <span
                  className={`font-semibold ${
                    order.payment_status === "paid"
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {order.payment_status}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 sm:col-span-2">
            <MapPin size={18} className="text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-text text-xs font-semibold uppercase">
                Delivery Address
              </p>
              <p className="text-heading font-semibold">
                {order.delivery_address}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="border-gray-border rounded-2xl border bg-white p-6">
          <h3 className="font-syne text-heading mb-4 font-bold">
            Upload Proof of Delivery
          </h3>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-primary hover:bg-primary hover:bg-opacity-5 cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors"
          >
            <Camera size={32} className="text-primary mx-auto mb-2" />
            <p className="text-heading mb-1 font-semibold">
              Click to upload photos
            </p>
            <p className="text-text text-sm">
              Drag and drop or click to select images
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
          </div>

          {/* Photo Gallery */}
          {photoUrls.length > 0 && (
            <div className="mt-4">
              <p className="text-text mb-2 text-sm font-semibold">
                {photoUrls.length} photo{photoUrls.length !== 1 ? "s" : ""}{" "}
                selected
              </p>
              <div className="grid grid-cols-3 gap-3">
                {photoUrls.map((url, i) => (
                  <div
                    key={i}
                    className="border-gray-border bg-bg-light group relative aspect-square overflow-hidden rounded-lg border"
                  >
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="bg-opacity-50 absolute inset-0 flex items-center justify-center bg-black opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <span className="text-sm font-semibold text-white">
                        Remove
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="border-gray-border rounded-2xl border bg-white p-6">
          <h3 className="font-syne text-heading mb-4 font-bold">
            Delivery Notes
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about the delivery (e.g., 'Left with security guard', 'Partial delivery', etc.)"
            className="border-gray-border focus:ring-primary w-full resize-none rounded-lg border px-4 py-3 focus:border-transparent focus:ring-2 focus:outline-none"
            rows={4}
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboards/admin/deliveries")}
            className="border-gray-border text-heading hover:bg-bg-light flex-1 rounded-lg border px-4 py-3 font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || photos.length === 0}
            className="bg-primary hover:bg-opacity-90 flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                Confirm Delivery
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
