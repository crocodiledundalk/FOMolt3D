export function errorTable(): string {
  return `
## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | GameNotActive | Molt is not currently active |
| 6001 | GameStillActive | Cannot start new molt while active |
| 6002 | TimerExpired | Cannot grab claws after timer expires |
| 6003 | TimerNotExpired | Cannot claim King Claw prize before timer expires |
| 6004 | InsufficientFunds | Not enough SOL to complete grab |
| 6005 | NoKeysToBuy | Must grab at least 1 claw |
| 6006 | NoDividendsToClaim | No pending scraps to harvest |
| 6007 | NotWinner | Only King Claw can claim the winner prize |
| 6008 | WinnerAlreadyClaimed | King Claw prize has already been claimed |
| 6009 | CannotReferSelf | Cannot use your own shell link |
| 6010 | ReferrerNotInRound | Referrer must be a participant in the current molt |
| 6011 | Overflow | Arithmetic overflow in calculation |

All errors return standard JSON: \`{"error": "ErrorName", "code": 6000, "details": "..."}\``;
}
