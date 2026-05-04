/**
 * @file ChangeContestTable.jsx
 * @description
 * Compact table that lists contests available for participants to join.
 * Migrated from MUI Table to native HTML table + Tailwind for compact density.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */

import React from 'react';
import ChangeContestList from './ChangeContestList';

function ChangeContestTable({ contests, onRowClick }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="px-4 py-3 text-sm font-semibold">
                Competition Name
              </th>
              <th className="px-4 py-3 text-sm font-semibold">Category</th>
              <th className="px-4 py-3 text-sm font-semibold">Date</th>
              <th className="px-4 py-3 text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-sm font-semibold">Join</th>
            </tr>
          </thead>
          <tbody>
            {contests.map((contest, index) => (
              <ChangeContestList
                key={contest.id ?? index}
                contest={contest}
                onClick={() => onRowClick?.(contest)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ChangeContestTable;
