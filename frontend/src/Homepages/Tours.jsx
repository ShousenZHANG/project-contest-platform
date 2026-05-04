/**
 * Tours.jsx
 *
 * Legacy tours showcase (currently not mounted in HomePage). Migrated from
 * CSS to shadcn Card + Tailwind grid for consistency with the rest of the
 * Homepages module.
 */

import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const tours = [
  {
    title: 'Alone with nature',
    price: '$100 / person',
    image: 'https://via.placeholder.com/200',
  },
  {
    title: 'Jeep ride',
    price: '$200 / person',
    image: 'https://via.placeholder.com/200',
  },
  {
    title: 'Hiking tour',
    price: '$150 / person',
    image: 'https://via.placeholder.com/200',
  },
  {
    title: 'Corners of the island',
    price: '$80 / person',
    image: 'https://via.placeholder.com/200',
  },
];

function Tours() {
  return (
    <section className="bg-background py-24">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-4xl font-bold tracking-tight text-center text-foreground mb-12">
          Choose your contest
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {tours.map((tour) => (
            <Card
              key={tour.title}
              className="overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                <img
                  src={tour.image}
                  alt={tour.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <CardContent className="p-4">
                <h3 className="text-base font-semibold tracking-tight">
                  {tour.title}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {tour.price}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button size="lg">See all</Button>
        </div>
      </div>
    </section>
  );
}

export default Tours;
