import React from 'react'
import Title from '../components/Title'
import { assets } from '../assets/assets'
import { useAppContext } from '../context/AppContext'

const BENEFITS = [
  {
    icon: assets.locationFilledIcon,
    title: 'Prime Location',
    description: 'Steps away from the city\'s best attractions, dining, and transport links.',
  },
  {
    icon: assets.roomServiceIcon,
    title: 'Exceptional Service',
    description: 'Our staff go above and beyond to make every stay feel personal and effortless.',
  },
  {
    icon: assets.heartIcon,
    title: 'Ultimate Comfort',
    description: 'Thoughtfully designed rooms and amenities built around your relaxation.',
  },
];

const About = () => {
  const { hotel } = useAppContext();

  return (
    <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32'>

      <Title align='left' title={`About ${hotel?.name || 'Us'}`} subtitle='A trusted name in
      hospitality, dedicated to making every guest feel at home.' />

      <div className='flex flex-col md:flex-row items-center gap-10 mt-10'>
        <img src={assets.hotelImg} alt={hotel?.name || 'Hotel'} className='w-full md:w-1/2 rounded-xl shadow-lg object-cover max-h-96' />
        <p className='text-gray-600 md:w-1/2'>
          {hotel?.description ||
            `${hotel?.name || 'We'} welcome travelers with warm hospitality and modern comfort.
            Whether you're here for business, leisure, or a special celebration, our team is
            committed to making your stay seamless from check-in to check-out.`}
        </p>
      </div>

      <div className='mt-20'>
        <Title align='left' title='Why Choose Us' subtitle='' />
        <div className='grid sm:grid-cols-3 gap-8 mt-8'>
          {BENEFITS.map((benefit) => (
            <div key={benefit.title} className='flex flex-col items-start gap-3 p-6 border border-gray-200 rounded-xl'>
              <img src={benefit.icon} alt={benefit.title} className='w-8 h-8' />
              <h3 className='text-lg font-medium'>{benefit.title}</h3>
              <p className='text-sm text-gray-500'>{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About