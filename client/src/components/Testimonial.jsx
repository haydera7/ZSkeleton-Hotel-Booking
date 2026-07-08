import React, { useEffect, useState } from 'react'
import Title from './Title'
import StarRating from './StarRating'
import { useAppContext } from '../context/AppContext'

const Testimonial = () => {
  const { axios, hotel } = useAppContext();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const { data } = await axios.get('/api/bookings/reviews');
        if (data.success) setReviews(data.reviews);
      } catch (error) {
        console.log('Failed to load reviews:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [axios]);

  const formatDate = (date) => {
    if(!date) return '';
    return new Date(date).toLocaleDateString(undefined, {month: 'short', year: 'numeric'});
  }

  return (
    <section className='px-6 md:px-16 lg:px-24 bg-slate-50 py-16 md:py-24'>
      <div className='mx-auto max-w-6xl'>
      <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <Title title='Guest Reviews' subtitle={`Verified feedback from guests who completed stays at ${hotel?.name || 'our hotel'}.`}/>
        {reviews.length > 0 && (
          <div className='rounded-lg border border-gray-200 bg-white px-5 py-3 text-sm shadow-sm'>
            <p className='text-gray-400'>Published reviews</p>
            <p className='mt-1 text-2xl font-semibold text-gray-900'>{reviews.length}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className='mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {[1,2,3].map((item) => (
            <div key={item} className='bg-white border border-gray-200 rounded-lg p-6 min-h-58 animate-pulse'>
              <div className='h-5 w-32 bg-gray-200 rounded'></div>
              <div className='h-4 w-24 bg-gray-100 rounded mt-3'></div>
              <div className='flex gap-2 mt-6'>
                {[1,2,3,4,5].map(star => <span key={star} className='h-4 w-4 bg-gray-100 rounded-full'></span>)}
              </div>
              <div className='space-y-3 mt-6'>
                <div className='h-3 bg-gray-100 rounded'></div>
                <div className='h-3 bg-gray-100 rounded w-5/6'></div>
              </div>
            </div>
          ))}
        </div>
      ) : reviews.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reviews.map((review) => (
            <article key={review._id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 min-h-58 flex flex-col">
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className="font-playfair text-xl text-gray-900 leading-tight">{review.guestName}</p>
                  <p className="text-sm text-gray-500 mt-1">{review.roomType}</p>
                </div>
                {review.reviewedAt && (
                  <span className='text-xs text-gray-400 shrink-0'>{formatDate(review.reviewedAt)}</span>
                )}
              </div>

              <div className="flex items-center gap-1 mt-5">
                <StarRating rating={review.rating} />
                <span className='text-sm text-gray-500 ml-2'>{review.rating}/5</span>
              </div>

              <p className="text-gray-600 text-sm leading-6 mt-5 flex-1">"{review.comment}"</p>
              <div className='mt-5 border-t border-gray-100 pt-4'>
                <span className='rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700'>
                  Verified completed stay
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className='mt-10 max-w-xl mx-auto text-center bg-white border border-dashed border-gray-300 rounded-lg px-6 py-10'>
          <p className='font-medium text-gray-800'>No reviews yet</p>
          <p className='text-gray-500 text-sm mt-2'>
            Guest reviews will appear here after completed stays.
          </p>
        </div>
      )}
      </div>
    </section>
  )
}

export default Testimonial
