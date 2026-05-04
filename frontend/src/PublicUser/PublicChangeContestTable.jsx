/**
 * PublicChangeContestTable.jsx
 *
 * Table wrapper that renders contest rows for public users.
 * Migrated from MUI to native table + Tailwind.
 *
 * Role: Public User
 * Developer: Beiqi Dai (migrated)
 */
import React from "react";
import { Card } from "@/components/ui/card";
import ChangeContestList from "./PublicChangeContestList";

function PublicChangeContestTable({ contests, onRowClick }) {
  return (
    <Card className="overflow-hidden border-border/60 shadow-md">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-orange-300 text-white">
              <th className="px-4 py-3 text-left text-base font-bold">
                Competition Name
              </th>
              <th className="px-4 py-3 text-left text-base font-bold">Category</th>
              <th className="px-4 py-3 text-left text-base font-bold">Date</th>
              <th className="px-4 py-3 text-left text-base font-bold">Status</th>
              <th className="px-4 py-3 text-left text-base font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {contests.map((contest, index) => (
              <ChangeContestList
                key={index}
                contest={contest}
                onClick={() => onRowClick && onRowClick(contest)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default PublicChangeContestTable;
