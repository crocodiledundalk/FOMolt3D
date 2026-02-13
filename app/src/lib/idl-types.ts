/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/fomolt3d.json`.
 */
export type Fomolt3d = {
  "address": "EebbWtjHyocWPwZaQ4k2L61mSdW6y175knsEwppTpdWw",
  "metadata": {
    "name": "fomolt3d",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "AI-agent-first FOMO3D game theory experiment on Solana"
  },
  "instructions": [
    {
      "name": "buyKeys",
      "discriminator": [
        24,
        8,
        156,
        247,
        54,
        32,
        202,
        117
      ],
      "accounts": [
        {
          "name": "buyer",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "game_state.round",
                "account": "gameState"
              }
            ]
          }
        },
        {
          "name": "playerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "buyer"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Game vault PDA that holds SOL"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gameState"
              }
            ]
          }
        },
        {
          "name": "protocolWallet",
          "docs": [
            "Protocol fee recipient wallet"
          ],
          "writable": true
        },
        {
          "name": "referrerState",
          "docs": [
            "Optional referrer's PlayerState — must be writable for referral credit."
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "referrerWallet",
          "docs": [
            "Optional referrer's wallet for direct referral payment."
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "keysToBuy",
          "type": "u64"
        },
        {
          "name": "isAgent",
          "type": "bool"
        }
      ]
    },
    {
      "name": "claim",
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true,
          "relations": [
            "playerState"
          ]
        },
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "game_state.round",
                "account": "gameState"
              }
            ]
          }
        },
        {
          "name": "playerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Game vault PDA that holds SOL"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gameState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "claimReferralEarnings",
      "discriminator": [
        162,
        50,
        120,
        14,
        177,
        183,
        159,
        153
      ],
      "accounts": [
        {
          "name": "player",
          "writable": true,
          "signer": true,
          "relations": [
            "playerState"
          ]
        },
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "game_state.round",
                "account": "gameState"
              }
            ]
          }
        },
        {
          "name": "playerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Game vault PDA that holds SOL"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gameState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "createOrUpdateConfig",
      "discriminator": [
        250,
        130,
        73,
        220,
        98,
        190,
        198,
        143
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "configParams"
            }
          }
        }
      ]
    },
    {
      "name": "initializeFirstRound",
      "discriminator": [
        168,
        192,
        19,
        39,
        240,
        6,
        90,
        67
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "gameState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "const",
                "value": [
                  1,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0,
                  0
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "docs": [
            "Game vault PDA that holds SOL"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "gameState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "startNewRound",
      "discriminator": [
        180,
        48,
        50,
        160,
        186,
        163,
        79,
        185
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "prevGameState",
          "docs": [
            "Previous round's game state"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "prev_game_state.round",
                "account": "gameState"
              }
            ]
          }
        },
        {
          "name": "newGameState",
          "docs": [
            "New round's game state PDA"
          ],
          "writable": true
        },
        {
          "name": "prevVault",
          "docs": [
            "Previous round's vault"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "prevGameState"
              }
            ]
          }
        },
        {
          "name": "newVault",
          "docs": [
            "New round's vault"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "newGameState"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "gameState",
      "discriminator": [
        144,
        94,
        208,
        172,
        248,
        99,
        134,
        120
      ]
    },
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    },
    {
      "name": "playerState",
      "discriminator": [
        56,
        3,
        60,
        86,
        174,
        16,
        244,
        195
      ]
    }
  ],
  "events": [
    {
      "name": "claimed",
      "discriminator": [
        217,
        192,
        123,
        72,
        108,
        150,
        248,
        33
      ]
    },
    {
      "name": "gameUpdated",
      "discriminator": [
        100,
        97,
        130,
        101,
        84,
        101,
        4,
        15
      ]
    },
    {
      "name": "keysPurchased",
      "discriminator": [
        187,
        12,
        152,
        10,
        151,
        18,
        44,
        235
      ]
    },
    {
      "name": "protocolFeeCollected",
      "discriminator": [
        149,
        0,
        167,
        154,
        105,
        146,
        209,
        134
      ]
    },
    {
      "name": "referralClaimed",
      "discriminator": [
        195,
        109,
        77,
        196,
        134,
        226,
        78,
        108
      ]
    },
    {
      "name": "referralEarned",
      "discriminator": [
        243,
        117,
        80,
        205,
        187,
        9,
        77,
        23
      ]
    },
    {
      "name": "roundConcluded",
      "discriminator": [
        253,
        3,
        254,
        156,
        25,
        119,
        156,
        173
      ]
    },
    {
      "name": "roundStarted",
      "discriminator": [
        180,
        209,
        2,
        244,
        238,
        48,
        170,
        120
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "gameNotActive",
      "msg": "Game round is not active"
    },
    {
      "code": 6001,
      "name": "gameStillActive",
      "msg": "Game round is still active"
    },
    {
      "code": 6002,
      "name": "timerExpired",
      "msg": "Timer has expired"
    },
    {
      "code": 6003,
      "name": "timerNotExpired",
      "msg": "Timer has not expired yet"
    },
    {
      "code": 6004,
      "name": "insufficientFunds",
      "msg": "Insufficient funds for purchase"
    },
    {
      "code": 6005,
      "name": "noKeysToBuy",
      "msg": "Must buy at least one key"
    },
    {
      "code": 6006,
      "name": "nothingToClaim",
      "msg": "Nothing to claim"
    },
    {
      "code": 6007,
      "name": "notWinner",
      "msg": "Only the last buyer can claim the winner prize"
    },
    {
      "code": 6008,
      "name": "winnerAlreadyClaimed",
      "msg": "Winner prize has already been claimed"
    },
    {
      "code": 6009,
      "name": "winnerNotClaimed",
      "msg": "Winner has not claimed prize yet"
    },
    {
      "code": 6010,
      "name": "cannotReferSelf",
      "msg": "Cannot refer yourself"
    },
    {
      "code": 6011,
      "name": "referrerMismatch",
      "msg": "Referrer does not match stored referrer"
    },
    {
      "code": 6012,
      "name": "referrerNotRegistered",
      "msg": "Referrer is not registered in this round"
    },
    {
      "code": 6013,
      "name": "noReferralEarnings",
      "msg": "No referral earnings to claim"
    },
    {
      "code": 6014,
      "name": "unauthorized",
      "msg": "Unauthorized: admin only"
    },
    {
      "code": 6015,
      "name": "invalidConfig",
      "msg": "Invalid configuration parameters"
    },
    {
      "code": 6016,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6017,
      "name": "playerAlreadyRegistered",
      "msg": "Player is already registered in this round"
    },
    {
      "code": 6018,
      "name": "mustClaimPreviousRound",
      "msg": "Must claim previous round before joining a new one"
    },
    {
      "code": 6019,
      "name": "playerNotInRound",
      "msg": "Player is not in this round"
    }
  ],
  "types": [
    {
      "name": "claimed",
      "docs": [
        "Emitted when a player claims dividends and/or winner prize"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "dividendLamports",
            "type": "u64"
          },
          {
            "name": "winnerLamports",
            "type": "u64"
          },
          {
            "name": "totalLamports",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "configParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basePriceLamports",
            "type": "u64"
          },
          {
            "name": "priceIncrementLamports",
            "type": "u64"
          },
          {
            "name": "timerExtensionSecs",
            "type": "i64"
          },
          {
            "name": "maxTimerSecs",
            "type": "i64"
          },
          {
            "name": "winnerBps",
            "type": "u64"
          },
          {
            "name": "dividendBps",
            "type": "u64"
          },
          {
            "name": "nextRoundBps",
            "type": "u64"
          },
          {
            "name": "protocolFeeBps",
            "type": "u64"
          },
          {
            "name": "referralBonusBps",
            "type": "u64"
          },
          {
            "name": "protocolWallet",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "gameState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "docs": [
              "Round number (0-indexed)"
            ],
            "type": "u64"
          },
          {
            "name": "potLamports",
            "docs": [
              "Total SOL deposited this round (lamports) — informational, tracks gross spend"
            ],
            "type": "u64"
          },
          {
            "name": "timerEnd",
            "docs": [
              "Unix timestamp when timer expires"
            ],
            "type": "i64"
          },
          {
            "name": "lastBuyer",
            "docs": [
              "Address of most recent key buyer (potential winner)"
            ],
            "type": "pubkey"
          },
          {
            "name": "totalKeys",
            "docs": [
              "Total keys sold this round"
            ],
            "type": "u64"
          },
          {
            "name": "roundStart",
            "docs": [
              "Unix timestamp of round start"
            ],
            "type": "i64"
          },
          {
            "name": "active",
            "docs": [
              "Whether round is active"
            ],
            "type": "bool"
          },
          {
            "name": "winnerClaimed",
            "docs": [
              "Whether winner has claimed prize"
            ],
            "type": "bool"
          },
          {
            "name": "totalPlayers",
            "docs": [
              "Number of unique players in this round"
            ],
            "type": "u32"
          },
          {
            "name": "totalDividendPool",
            "docs": [
              "Total lamports allocated to dividends this round (claimed proportionally at round end)"
            ],
            "type": "u64"
          },
          {
            "name": "nextRoundPot",
            "docs": [
              "Accumulated carry for next round (lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "winnerPot",
            "docs": [
              "Accumulated winner share (lamports) — paid out on claim"
            ],
            "type": "u64"
          },
          {
            "name": "basePriceLamports",
            "docs": [
              "Snapshot: base price per key in lamports"
            ],
            "type": "u64"
          },
          {
            "name": "priceIncrementLamports",
            "docs": [
              "Snapshot: price increment per key"
            ],
            "type": "u64"
          },
          {
            "name": "timerExtensionSecs",
            "docs": [
              "Snapshot: seconds added to timer per buy"
            ],
            "type": "i64"
          },
          {
            "name": "maxTimerSecs",
            "docs": [
              "Snapshot: maximum timer duration in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "winnerBps",
            "docs": [
              "Snapshot: winner share in basis points"
            ],
            "type": "u64"
          },
          {
            "name": "dividendBps",
            "docs": [
              "Snapshot: dividend share in basis points"
            ],
            "type": "u64"
          },
          {
            "name": "nextRoundBps",
            "docs": [
              "Snapshot: next round carry share in basis points"
            ],
            "type": "u64"
          },
          {
            "name": "protocolFeeBps",
            "docs": [
              "Snapshot: protocol fee in basis points"
            ],
            "type": "u64"
          },
          {
            "name": "referralBonusBps",
            "docs": [
              "Snapshot: referral bonus as BPS of dividend portion"
            ],
            "type": "u64"
          },
          {
            "name": "protocolWallet",
            "docs": [
              "Snapshot: wallet that receives protocol fees"
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "gameUpdated",
      "docs": [
        "Emitted after every key purchase with high-level game state"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "potLamports",
            "type": "u64"
          },
          {
            "name": "totalKeys",
            "type": "u64"
          },
          {
            "name": "nextKeyPrice",
            "type": "u64"
          },
          {
            "name": "lastBuyer",
            "type": "pubkey"
          },
          {
            "name": "timerEnd",
            "type": "i64"
          },
          {
            "name": "winnerPot",
            "type": "u64"
          },
          {
            "name": "nextRoundPot",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "globalConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "docs": [
              "Admin authority — only this signer can update config or start round 1"
            ],
            "type": "pubkey"
          },
          {
            "name": "basePriceLamports",
            "docs": [
              "Base price per key in lamports"
            ],
            "type": "u64"
          },
          {
            "name": "priceIncrementLamports",
            "docs": [
              "Price increment per key already sold"
            ],
            "type": "u64"
          },
          {
            "name": "timerExtensionSecs",
            "docs": [
              "Seconds added to timer per buy"
            ],
            "type": "i64"
          },
          {
            "name": "maxTimerSecs",
            "docs": [
              "Maximum timer duration in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "winnerBps",
            "docs": [
              "Winner share in basis points"
            ],
            "type": "u64"
          },
          {
            "name": "dividendBps",
            "docs": [
              "Dividend share in basis points"
            ],
            "type": "u64"
          },
          {
            "name": "nextRoundBps",
            "docs": [
              "Next round carry share in basis points"
            ],
            "type": "u64"
          },
          {
            "name": "protocolFeeBps",
            "docs": [
              "Protocol fee in basis points"
            ],
            "type": "u64"
          },
          {
            "name": "referralBonusBps",
            "docs": [
              "Referral bonus as BPS of after-fee amount"
            ],
            "type": "u64"
          },
          {
            "name": "protocolWallet",
            "docs": [
              "Wallet that receives protocol fees"
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "keysPurchased",
      "docs": [
        "Emitted on every key purchase"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "isAgent",
            "type": "bool"
          },
          {
            "name": "keysBought",
            "type": "u64"
          },
          {
            "name": "totalPlayerKeys",
            "type": "u64"
          },
          {
            "name": "lamportsSpent",
            "type": "u64"
          },
          {
            "name": "potContribution",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "playerState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "docs": [
              "Player's wallet address"
            ],
            "type": "pubkey"
          },
          {
            "name": "keys",
            "docs": [
              "Keys held in this round"
            ],
            "type": "u64"
          },
          {
            "name": "currentRound",
            "docs": [
              "Current round this player is participating in"
            ],
            "type": "u64"
          },
          {
            "name": "claimedDividendsLamports",
            "docs": [
              "Total dividends already withdrawn (lamports)"
            ],
            "type": "u64"
          },
          {
            "name": "referrer",
            "docs": [
              "Who referred this player (set once, immutable after)"
            ],
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "referralEarningsLamports",
            "docs": [
              "Accumulated earnings from being someone's referrer (not yet claimed)"
            ],
            "type": "u64"
          },
          {
            "name": "claimedReferralEarningsLamports",
            "docs": [
              "Total referral earnings already claimed"
            ],
            "type": "u64"
          },
          {
            "name": "isAgent",
            "docs": [
              "Whether this player is an AI agent (vs human)"
            ],
            "type": "bool"
          },
          {
            "name": "bump",
            "docs": [
              "PDA bump seed"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "protocolFeeCollected",
      "docs": [
        "Emitted when protocol fees are collected"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "lamports",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "referralClaimed",
      "docs": [
        "Emitted when referral earnings are claimed"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "lamports",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "referralEarned",
      "docs": [
        "Emitted when a referral bonus is earned"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "referrer",
            "type": "pubkey"
          },
          {
            "name": "keysBought",
            "type": "u64"
          },
          {
            "name": "lamportsSpent",
            "type": "u64"
          },
          {
            "name": "referrerLamports",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roundConcluded",
      "docs": [
        "Emitted when a round concludes (winner claims or empty round closes)"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "winner",
            "type": "pubkey"
          },
          {
            "name": "winnerLamports",
            "type": "u64"
          },
          {
            "name": "potLamports",
            "type": "u64"
          },
          {
            "name": "totalKeys",
            "type": "u64"
          },
          {
            "name": "totalPlayers",
            "type": "u32"
          },
          {
            "name": "nextRoundPot",
            "type": "u64"
          },
          {
            "name": "roundStart",
            "type": "i64"
          },
          {
            "name": "roundEnd",
            "type": "i64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "roundStarted",
      "docs": [
        "Emitted when a new round starts"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "carryOverLamports",
            "type": "u64"
          },
          {
            "name": "timerEnd",
            "type": "i64"
          },
          {
            "name": "basePriceLamports",
            "type": "u64"
          },
          {
            "name": "priceIncrementLamports",
            "type": "u64"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    }
  ]
};
