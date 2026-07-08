import React, { useEffect, useState } from 'react'
import Title from '../../components/Title'
import { useAppContext } from '../../context/AppContext'
import StarRating from '../../components/StarRating'
import toast from 'react-hot-toast'

const Reviews = () => {
  const {axios, getToken} = useAppContext();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchReviews = async () => {
    try {
      const {data} = await axios.get('/api/bookings/admin/reviews', {
        headers: {Authorization: `Bearer ${await getToken()}`}
      });
      if(data.success){
        setReviews(data.reviews);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReviews();
  }, []);

  const updateVisibility = async (bookingId, isVisible) => {
    setUpdatingId(bookingId);
    try {
      const {data} = await axios.patch(`/api/bookings/${bookingId}/review-visibility`, {isVisible}, {
        headers: {Authorization: `Bearer ${await getToken()}`}
      });
      if(data.success){
        toast.success(data.message);
        setReviews(prev => prev.map(review => review._id === bookingId ? {...review, isVisible} : review));
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if(loading) return <p className='mt-10 text-gray-500'>Loading reviews...</p>

  return (
    <div>
      <Title align='left' font='outfit' title='Reviews' subtitle='Moderate guest reviews from checked-out bookings. Hidden reviews stay saved but no longer appear publicly.' />

      <div className='mt-8 grid gap-4 max-w-5xl'>
        {reviews.map(review => (
          <div key={review._id} className='border border-gray-200 rounded-lg bg-white p-5'>
            <div className='flex flex-col md:flex-row md:items-start md:justify-between gap-4'>
              <div>
                <p className='font-medium text-gray-800'>{review.guestName}</p>
                <p className='text-xs text-gray-400'>{review.roomType}{review.guestPhone ? ` · ${review.guestPhone}` : ''}</p>
                <div className='flex items-center gap-1 mt-2'>
                  <StarRating rating={review.rating} />
                </div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full self-start ${review.isVisible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {review.isVisible ? 'Visible' : 'Hidden'}
              </span>
            </div>

            <p className='text-sm text-gray-600 mt-4'>"{review.comment}"</p>
            <p className='text-xs text-gray-400 mt-2'>
              Reviewed {review.reviewedAt ? new Date(review.reviewedAt).toLocaleDateString() : '-'}
            </p>

            <button
              onClick={() => updateVisibility(review._id, !review.isVisible)}
              disabled={updatingId === review._id}
              className='mt-4 px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 cursor-pointer disabled:opacity-50'>
              {updatingId === review._id ? 'Updating...' : review.isVisible ? 'Hide Review' : 'Restore Review'}
            </button>
          </div>
        ))}

        {reviews.length === 0 && (
          <p className='text-gray-400 text-sm py-10 text-center border border-gray-200 rounded-lg'>No guest reviews yet.</p>
        )}
      </div>
    </div>
  )
}

export default Reviews
