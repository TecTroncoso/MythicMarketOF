"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MessageSquare, Star } from 'lucide-react';
import { createReview, getReviews } from '@/lib/actions/reviews';

type Review = {
  id: string;
  rating: number;
  text: string;
  date: string;
  displayName: string;
};

type SessionUser = {
  name?: string | null;
  email?: string | null;
};

export function ReviewsSection() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    // Resolve the session once on the client (mirrors UserMenu), then load
    // the reviews from the database. Failures keep the section usable.
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch('/api/auth/session', { signal: controller.signal });
        const data = (await res.json()) as { user?: SessionUser } | null;
        if (data?.user) {
          setSessionUser(data.user);
        }
      } catch {
        // Stay logged-out on failure.
      }
      try {
        const list = await getReviews();
        setReviews(list.map((review) => ({ ...review, date: new Date(review.createdAt).toLocaleDateString('es-ES') })));
      } catch {
        setLoadError(true);
      }
    })();
    return () => controller.abort();
  }, []);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewText.trim() || submitting) return;

    setSubmitting(true);
    try {
      const result = await createReview({ rating: newReviewRating, text: newReviewText });
      if (result.error) {
        setError(result.error);
      } else if (result.review) {
        const created = result.review;
        setReviews((prev) => [
          {
            ...created,
            date: new Date(created.createdAt).toLocaleDateString('es-ES'),
          },
          ...prev,
        ]);
        setNewReviewText('');
        setNewReviewRating(5);
        setError(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-[#121824] rounded-2xl p-6 md:p-8 border border-[#1c2534] shadow-xl mt-8 lg:col-span-2">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-8 h-8 text-[#ffaa00]" />
        <h3 className="text-2xl font-bold">Reseñas de Clientes</h3>
      </div>

      {sessionUser ? (
        <form onSubmit={handleAddReview} className="bg-[#0a0f1a] rounded-xl p-5 border border-[#2a3441] mb-8">
          <h4 className="font-bold text-lg mb-4 text-white">Deja tu reseña</h4>
          <p className="text-sm text-gray-400 mb-4">
            Reseñando como <span className="font-semibold text-gray-200">{sessionUser.name || sessionUser.email}</span>
          </p>
          <div className="space-y-2 mb-4">
            <label className="text-sm font-semibold text-gray-400 block">Calificación</label>
            <div className="flex items-center gap-2 h-[50px]">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  aria-label={`Calificar con ${star} estrellas`}
                  onClick={() => setNewReviewRating(star)}
                  className={`transition-colors ${star <= newReviewRating ? 'text-[#ffaa00]' : 'text-gray-600 hover:text-[#ffaa00]/70'}`}
                >
                  <Star className="w-8 h-8 fill-current" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2 mb-4">
            <label className="text-sm font-semibold text-gray-400 block">Comentario</label>
            <textarea
              value={newReviewText}
              onChange={(e) => setNewReviewText(e.target.value)}
              placeholder="¿Qué te pareció el servicio?"
              className="w-full bg-[#121824] border border-[#2a3441] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#ffaa00] focus:ring-1 focus:ring-[#ffaa00] transition-all min-h-[100px] resize-y"
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className={`bg-gradient-to-r from-[#2a3441] to-[#344050] hover:from-[#3a4759] hover:to-[#455469] text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-[#ffaa00] ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Publicar Reseña
          </button>
        </form>
      ) : (
        <div className="bg-[#0a0f1a] rounded-xl p-5 border border-[#2a3441] mb-8 text-center">
          <p className="text-gray-400 mb-3">Iniciá sesión para dejar tu reseña.</p>
          <Link href="/login" className="inline-block text-sm font-semibold bg-[#2a3441] hover:bg-[#344050] px-4 py-2 rounded-lg text-white transition-all">
            Iniciar Sesión
          </Link>
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loadError ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No se pudieron cargar las reseñas.</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border-2 border-dashed border-[#2a3441] rounded-xl">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Aún no hay reseñas. ¡Sé el primero en dejar una!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="bg-[#0a0f1a] rounded-xl p-5 border border-[#2a3441]">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-white">{review.displayName}</div>
                  <div className="text-xs text-gray-500">{review.date}</div>
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < review.rating ? 'text-[#ffaa00] fill-current' : 'text-gray-700 fill-current'}`} />
                  ))}
                </div>
              </div>
              <p className="text-gray-300 text-sm mt-3 leading-relaxed whitespace-pre-wrap">{review.text}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}