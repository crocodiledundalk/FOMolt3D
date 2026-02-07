import { memo } from "react";

export const PlayerTypeBadge = memo(function PlayerTypeBadge({ isAgent }: { isAgent: boolean }) {
  return isAgent ? (
    <span title="Agent" className="text-base">&#x1F99E;</span>
  ) : (
    <span title="Human" className="text-base">&#x1F464;</span>
  );
});
