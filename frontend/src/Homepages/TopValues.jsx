/**
 * TopValues.jsx
 *
 * Featured contests section on the homepage. Migrated from MUI/CSS to shadcn +
 * Tailwind grid. Uses ContestCard for each item.
 *
 * Developer: Beiqi Dai (migrated)
 */

import React from 'react';
import { Sparkles } from 'lucide-react';
import ContestCard from './ContestCard';

const sampleValues = [
  {
    id: 1,
    title: 'Car Design Contest',
    organizer: 'TechCarLead',
    date: '2025.04.10 ~ 05.10',
    description: 'Build an amazing car design!',
    category: 'Design',
    votes: 12,
    image:
      'https://i.pinimg.com/236x/c1/45/d8/c145d86ee6d5542020ca41c36113687d.jpg',
  },
  {
    id: 2,
    title: 'Music Contest',
    organizer: 'Music Master',
    date: '2025.05.01 ~ 06.01',
    description: 'Create an innovative music!',
    category: 'Music',
    votes: 34,
    image:
      'https://i.pinimg.com/474x/34/13/b2/3413b2fa409dc396c12527fc349eea70.jpg',
  },
  {
    id: 3,
    title: 'Cocktail Challenge',
    organizer: 'Wine Hub',
    date: '2025.06.15 ~ 07.15',
    description: 'Showcase your cocktail skills!',
    category: 'Food',
    votes: 56,
    image:
      'https://i.pinimg.com/236x/6a/b7/c2/6ab7c2657078ee3dc1dd1aaaaf7316b2.jpg',
  },
  {
    id: 4,
    title: 'Story Writing Challenge',
    organizer: 'Literature Hub',
    date: '2025.06.15 ~ 2025.07.15',
    description: 'Craft a compelling short story!',
    category: 'Literature',
    votes: 56,
    image:
      'https://i.pinimg.com/236x/43/0d/e5/430de57a137f68ab0c3bb2ecce4cdbcb.jpg',
  },
];

function TopValues() {
  return (
    <section className="relative bg-background py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            Featured this week
          </div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-3">
            Discover Top Opportunities
          </h2>
          <p className="text-lg text-muted-foreground">
            Explore a world of competitions and unlock your potential.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {sampleValues.map((item, index) => {
            const contest = {
              id: index,
              title: item.title,
              description: item.description,
              image: item.image,
              organizer: item.organizer,
              date: item.date,
              votes: item.votes,
              category: item.category,
            };

            return <ContestCard key={index} contest={contest} />;
          })}
        </div>
      </div>
    </section>
  );
}

export default TopValues;
