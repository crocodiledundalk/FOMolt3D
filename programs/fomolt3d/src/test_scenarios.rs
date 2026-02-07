//! Comprehensive scenario tests that simulate full game flows.
//!
//! These tests use a `GameSim` that mirrors on-chain state transitions
//! and verifies accounting invariants through realistic game scenarios.
//!
//! The new dividend model uses a simple `total_dividend_pool` accumulator.
//! Dividends are only claimable at round end (not mid-round).
//! Each player's share is: (player.keys * total_dividend_pool) / total_keys.

#[cfg(test)]
mod tests {
    use crate::constants::*;
    use crate::math;
    use std::collections::HashMap;

    // ===== Game Simulator =====

    /// Default config matching on-chain defaults
    fn default_config() -> GameConfig {
        GameConfig {
            base_price: DEFAULT_BASE_PRICE_LAMPORTS,
            price_increment: DEFAULT_PRICE_INCREMENT_LAMPORTS,
            winner_bps: DEFAULT_WINNER_BPS,
            dividend_bps: DEFAULT_DIVIDEND_BPS,
            next_round_bps: DEFAULT_NEXT_ROUND_BPS,
            protocol_fee_bps: DEFAULT_PROTOCOL_FEE_BPS,
            referral_bonus_bps: DEFAULT_REFERRAL_BONUS_BPS,
            timer_extension_secs: DEFAULT_TIMER_EXTENSION_SECS,
            max_timer_secs: DEFAULT_MAX_TIMER_SECS,
        }
    }

    #[derive(Clone)]
    struct GameConfig {
        base_price: u64,
        price_increment: u64,
        winner_bps: u64,
        dividend_bps: u64,
        next_round_bps: u64,
        protocol_fee_bps: u64,
        referral_bonus_bps: u64,
        timer_extension_secs: i64,
        max_timer_secs: i64,
    }

    #[derive(Clone, Default)]
    struct PlayerState {
        keys: u64,
        current_round: u64,
        claimed_dividends: u64,
        referrer: Option<String>,
        referral_earnings: u64,
        claimed_referral: u64,
        is_agent: bool,
    }

    struct GameSim {
        config: GameConfig,
        round: u64,
        total_keys: u64,
        total_players: u32,
        pot_lamports: u64,
        winner_pot: u64,
        next_round_pot: u64,
        total_dividend_pool: u64,
        vault_balance: u64,
        timer_end: i64,
        round_start: i64,
        last_buyer: String,
        active: bool,
        winner_claimed: bool,
        players: HashMap<String, PlayerState>,
        protocol_fees_collected: u64,
        // Tracking for invariant checks
        total_deposited: u64,
        total_withdrawn: u64,
        total_protocol_fees: u64,
    }

    impl GameSim {
        fn new(config: GameConfig) -> Self {
            let timer_end = 1000 + config.max_timer_secs;
            Self {
                config,
                round: 1, // first round = 1
                total_keys: 0,
                total_players: 0,
                pot_lamports: 0,
                winner_pot: 0,
                next_round_pot: 0,
                total_dividend_pool: 0,
                vault_balance: 0,
                timer_end,
                round_start: 1000,
                last_buyer: String::new(),
                active: true,
                winner_claimed: false,
                players: HashMap::new(),
                protocol_fees_collected: 0,
                total_deposited: 0,
                total_withdrawn: 0,
                total_protocol_fees: 0,
            }
        }

        fn new_with_carry(config: GameConfig, carry_over: u64, round: u64) -> Self {
            let timer_end = 1000 + config.max_timer_secs;
            Self {
                config,
                round,
                total_keys: 0,
                total_players: 0,
                pot_lamports: carry_over,
                winner_pot: carry_over, // Carry-over seeded into winner_pot
                next_round_pot: 0,
                total_dividend_pool: 0,
                vault_balance: carry_over,
                timer_end,
                round_start: 1000,
                last_buyer: String::new(),
                active: true,
                winner_claimed: false,
                players: HashMap::new(),
                protocol_fees_collected: 0,
                total_deposited: carry_over,
                total_withdrawn: 0,
                total_protocol_fees: 0,
            }
        }

        /// Register a player in the current round. Returns true if newly registered.
        fn register_player(&mut self, player_name: &str, referrer: Option<&str>) -> bool {
            if self.players.contains_key(player_name) {
                return false;
            }
            let mut ps = PlayerState {
                current_round: self.round,
                ..Default::default()
            };
            if let Some(ref_name) = referrer {
                assert_ne!(ref_name, player_name, "Cannot refer yourself");
                ps.referrer = Some(ref_name.to_string());
            }
            self.players.insert(player_name.to_string(), ps);
            self.total_players += 1;
            true
        }

        /// Simulate a key purchase. Player MUST already be registered.
        /// New fee ordering:
        ///   1. house_fee = cost * protocol_fee_bps / 10000
        ///   2. after_fee = cost - house_fee
        ///   3. vault_balance += after_fee
        ///   4. if referrer: referral = after_fee * referral_bonus_bps / 10000
        ///      pot_contribution = after_fee - referral
        ///   5. else: pot_contribution = after_fee
        ///   6. winner/dividend/next_round splits from pot_contribution
        /// Returns (cost, protocol_fee).
        fn buy_keys(&mut self, player_name: &str, keys: u64) -> (u64, u64) {
            assert!(self.active, "Game not active");
            assert!(keys > 0, "Must buy > 0 keys");
            assert!(
                self.players.contains_key(player_name),
                "Player '{}' must be registered before buying keys",
                player_name,
            );
            assert_eq!(
                self.players[player_name].current_round, self.round,
                "Player must claim previous round first"
            );

            let cost = math::calculate_cost(
                self.total_keys,
                keys,
                self.config.base_price,
                self.config.price_increment,
            )
            .unwrap();

            // Step 1: House fee off the top
            let house_fee =
                math::calculate_bps_split(cost, self.config.protocol_fee_bps).unwrap();
            let after_fee = cost - house_fee;

            // Step 2: Vault receives after_fee, protocol gets house_fee
            self.vault_balance += after_fee;
            self.protocol_fees_collected += house_fee;
            self.total_deposited += cost;
            self.total_protocol_fees += house_fee;

            // Step 3: Referral from after_fee (if applicable)
            let has_referrer = self.players[player_name].referrer.is_some();
            let referrer_name = self.players[player_name].referrer.clone();
            let pot_contribution;

            if has_referrer {
                let ref_name = referrer_name.as_ref().unwrap();
                assert!(
                    self.players.contains_key(ref_name.as_str()),
                    "Referrer '{}' must be registered",
                    ref_name,
                );

                let referral_bonus =
                    math::calculate_bps_split(after_fee, self.config.referral_bonus_bps)
                        .unwrap();
                if referral_bonus > 0 {
                    let referrer_state =
                        self.players.get_mut(ref_name.as_str()).unwrap();
                    referrer_state.referral_earnings += referral_bonus;
                }
                pot_contribution = after_fee - referral_bonus;
            } else {
                pot_contribution = after_fee;
            }

            // Step 4: Pot splits from pot_contribution
            let winner_amount =
                math::calculate_bps_split(pot_contribution, self.config.winner_bps).unwrap();
            let dividend_amount =
                math::calculate_bps_split(pot_contribution, self.config.dividend_bps).unwrap();
            let next_round_amount =
                math::calculate_bps_split(pot_contribution, self.config.next_round_bps).unwrap();

            // Step 5: Accumulate into pools
            self.total_dividend_pool += dividend_amount;
            self.winner_pot += winner_amount;
            self.next_round_pot += next_round_amount;

            // Step 6: Add keys to player and game
            {
                let player = self.players.get_mut(player_name).unwrap();
                player.keys += keys;
            }
            self.total_keys += keys;
            self.pot_lamports += cost;
            self.last_buyer = player_name.to_string();

            (cost, house_fee)
        }

        /// End the round (timer expiry sets active = false).
        fn end_round(&mut self) {
            self.active = false;
        }

        /// Claim dividends + optional winner prize. Round must be ended.
        /// Returns total claimed.
        fn claim(&mut self, player_name: &str) -> u64 {
            assert!(!self.active, "Round must be ended to claim");

            let dividend_share = math::calculate_dividend_share(
                self.players[player_name].keys,
                self.total_dividend_pool,
                self.total_keys,
            )
            .unwrap();

            let is_winner =
                player_name == self.last_buyer && !self.winner_claimed;
            let winner_payout = if is_winner { self.winner_pot } else { 0 };
            let total_payout = dividend_share + winner_payout;

            assert!(total_payout > 0, "Nothing to claim for '{}'", player_name);
            assert!(
                self.vault_balance >= total_payout,
                "Vault insolvent: vault={} payout={} (div={} winner={})",
                self.vault_balance,
                total_payout,
                dividend_share,
                winner_payout,
            );

            // Transfer
            self.vault_balance -= total_payout;
            self.total_withdrawn += total_payout;
            self.total_dividend_pool -= dividend_share;

            // Update player state
            let player = self.players.get_mut(player_name).unwrap();
            let player_keys = player.keys;
            player.claimed_dividends += dividend_share;
            player.keys = 0;
            player.current_round = 0; // sentinel: not in any round

            // Reduce total_keys so subsequent claims remain proportional
            self.total_keys -= player_keys;

            if is_winner {
                self.winner_claimed = true;
            }

            total_payout
        }

        /// Claim referral earnings. Returns amount claimed.
        fn claim_referral(&mut self, player_name: &str) -> u64 {
            let player = self.players.get_mut(player_name).unwrap();
            let amount = player.referral_earnings;
            assert!(amount > 0, "No referral earnings for '{}'", player_name);
            assert!(
                self.vault_balance >= amount,
                "Vault insolvent for referral: vault={} amount={}",
                self.vault_balance,
                amount,
            );

            self.vault_balance -= amount;
            self.total_withdrawn += amount;
            player.claimed_referral += amount;
            player.referral_earnings = 0;

            amount
        }

        /// Move a player from this (old, ended) game into a new GameSim.
        /// The player must have already claimed (current_round == 0).
        /// This simulates the "buy 0 keys in new round" registration path.
        fn move_player_to(
            &self,
            player_name: &str,
            new_game: &mut GameSim,
        ) {
            let player = self.players.get(player_name).unwrap();
            assert_eq!(
                player.current_round, 0,
                "Player '{}' must claim before moving to new round (current_round={})",
                player_name, player.current_round,
            );

            let mut ps = player.clone();
            ps.current_round = new_game.round;
            new_game.players.insert(player_name.to_string(), ps);
            new_game.total_players += 1;
        }

        /// Get pending dividends for a player (without claiming).
        /// Only meaningful at round end, but can be computed anytime.
        fn pending_dividends(&self, player_name: &str) -> u64 {
            let player = &self.players[player_name];
            math::calculate_dividend_share(
                player.keys,
                self.total_dividend_pool,
                self.total_keys,
            )
            .unwrap()
        }

        /// Calculate total committed obligations vs vault balance.
        fn solvency_check(&self) -> (u64, u64) {
            let mut total_owed: u64 = 0;

            // Total dividend pool (covers all unclaimed dividend shares)
            total_owed += self.total_dividend_pool;

            // Unclaimed referral earnings for all players
            for player in self.players.values() {
                total_owed += player.referral_earnings;
            }

            // Winner pot (if not yet claimed)
            if !self.winner_claimed {
                total_owed += self.winner_pot;
            }

            // Next round carry-over
            total_owed += self.next_round_pot;

            (total_owed, self.vault_balance)
        }
    }

    // ===== Scenario Tests =====

    // --- 1. Single Player Full Lifecycle ---

    #[test]
    fn scenario_single_player_buy_and_claim_winner() {
        let mut game = GameSim::new(default_config());

        // Register and buy 10 keys
        game.register_player("alice", None);
        let (cost, protocol_fee) = game.buy_keys("alice", 10);
        assert!(cost > 0);
        assert!(protocol_fee > 0);
        assert_eq!(game.total_keys, 10);
        assert_eq!(game.last_buyer, "alice");
        assert_eq!(game.round, 1);

        // Single player: dividends go to dividend pool (alice will claim them at end)
        let house_fee = math::calculate_bps_split(cost, game.config.protocol_fee_bps).unwrap();
        let after_fee = cost - house_fee;
        let pot_contribution = after_fee; // no referrer
        let winner_split =
            math::calculate_bps_split(pot_contribution, game.config.winner_bps).unwrap();
        let dividend_split =
            math::calculate_bps_split(pot_contribution, game.config.dividend_bps).unwrap();
        assert_eq!(game.winner_pot, winner_split);
        assert_eq!(game.total_dividend_pool, dividend_split);

        // Timer expires, end the round
        game.end_round();

        // Alice claims winner + dividends
        let payout = game.claim("alice");
        assert_eq!(payout, winner_split + dividend_split);
        assert!(game.winner_claimed);
        assert_eq!(game.players["alice"].current_round, 0);
        assert_eq!(game.players["alice"].keys, 0);
    }

    #[test]
    fn scenario_single_player_multiple_buys() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        let (cost1, fee1) = game.buy_keys("alice", 5);
        let (cost2, fee2) = game.buy_keys("alice", 3);

        // Alice should have 8 keys total
        assert_eq!(game.players["alice"].keys, 8);

        // Total dividend pool is sum of dividends from both buys
        let after_fee1 = cost1 - fee1;
        let after_fee2 = cost2 - fee2;
        let div1 = math::calculate_bps_split(after_fee1, game.config.dividend_bps).unwrap();
        let div2 = math::calculate_bps_split(after_fee2, game.config.dividend_bps).unwrap();
        assert_eq!(game.total_dividend_pool, div1 + div2);

        // End round and claim: alice gets 100% of dividend pool (only holder)
        game.end_round();
        let pending = game.pending_dividends("alice");
        assert_eq!(pending, game.total_dividend_pool);
    }

    // --- 2. Two Players Proportional Dividends ---

    #[test]
    fn scenario_two_players_proportional_dividends() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);

        // At round end, alice has 10/15 of pool, bob has 5/15
        game.end_round();
        let alice_pending = game.pending_dividends("alice");
        let bob_pending = game.pending_dividends("bob");

        let expected_alice =
            (10u128 * game.total_dividend_pool as u128 / 15u128) as u64;
        let expected_bob =
            (5u128 * game.total_dividend_pool as u128 / 15u128) as u64;

        assert_eq!(alice_pending, expected_alice);
        assert_eq!(bob_pending, expected_bob);

        // Both claim
        let alice_payout = game.claim("alice");
        assert!(alice_payout > 0);
        // Bob is last buyer so is winner
        let bob_payout = game.claim("bob");
        assert!(bob_payout > expected_bob); // gets winner_pot too
    }

    #[test]
    fn scenario_three_players_proportional_dividends() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.register_player("carol", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);
        game.buy_keys("carol", 5);

        assert_eq!(game.total_keys, 20);

        game.end_round();

        // Alice: 10/20 = 50%, Bob: 5/20 = 25%, Carol: 5/20 = 25%
        let pool = game.total_dividend_pool;
        let alice_share = game.pending_dividends("alice");
        let bob_share = game.pending_dividends("bob");
        let carol_share = game.pending_dividends("carol");

        assert_eq!(alice_share, (10u128 * pool as u128 / 20u128) as u64);
        assert_eq!(bob_share, (5u128 * pool as u128 / 20u128) as u64);
        assert_eq!(carol_share, (5u128 * pool as u128 / 20u128) as u64);

        // Sum of shares should be <= pool (rounding dust possible)
        assert!(alice_share + bob_share + carol_share <= pool);
    }

    // --- 3. Five Players Varied Keys ---

    #[test]
    fn scenario_five_players_varied_keys() {
        let mut game = GameSim::new(default_config());

        for name in ["p1", "p2", "p3", "p4", "p5"] {
            game.register_player(name, None);
        }

        game.buy_keys("p1", 20);
        game.buy_keys("p2", 10);
        game.buy_keys("p3", 30);
        game.buy_keys("p4", 5);
        game.buy_keys("p5", 15);

        assert_eq!(game.total_keys, 80);

        game.end_round();

        // Each player's share is proportional
        let pool = game.total_dividend_pool;
        let shares: Vec<(&str, u64)> = vec![
            ("p1", 20),
            ("p2", 10),
            ("p3", 30),
            ("p4", 5),
            ("p5", 15),
        ];

        for (name, keys) in &shares {
            let pending = game.pending_dividends(name);
            let expected = (*keys as u128 * pool as u128 / 80u128) as u64;
            assert!(
                pending.abs_diff(expected) <= 1,
                "{}: pending={} expected={}",
                name,
                pending,
                expected,
            );
        }

        // Solvency check
        let (owed, vault) = game.solvency_check();
        assert!(
            vault >= owed,
            "INSOLVENT: owed={} vault={} shortfall={}",
            owed,
            vault,
            owed.saturating_sub(vault),
        );
    }

    // --- 4. Referral Bonus Accounting ---

    #[test]
    fn scenario_referral_bonus_credited() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.buy_keys("alice", 1);

        // Bob registers with alice as referrer
        game.register_player("bob", Some("alice"));
        let (cost_bob, fee_bob) = game.buy_keys("bob", 10);

        let after_fee = cost_bob - fee_bob;
        let expected_referral =
            math::calculate_bps_split(after_fee, game.config.referral_bonus_bps).unwrap();

        let alice = &game.players["alice"];
        assert_eq!(
            alice.referral_earnings, expected_referral,
            "referral earnings: got={} expected={}",
            alice.referral_earnings, expected_referral,
        );

        // Alice can claim referral separately
        let ref_claimed = game.claim_referral("alice");
        assert_eq!(ref_claimed, expected_referral);
        assert_eq!(game.players["alice"].referral_earnings, 0);
        assert_eq!(game.players["alice"].claimed_referral, expected_referral);
    }

    #[test]
    fn scenario_referral_reduces_pot_contribution() {
        // Compare pot contributions with and without referral
        let config = default_config();

        // Game A: no referral
        let mut game_a = GameSim::new(config.clone());
        game_a.register_player("holder", None);
        game_a.register_player("buyer", None);
        game_a.buy_keys("holder", 10);
        game_a.buy_keys("buyer", 5);
        let div_pool_no_ref = game_a.total_dividend_pool;
        let winner_pot_no_ref = game_a.winner_pot;

        // Game B: buyer has referral (holder is referrer)
        let mut game_b = GameSim::new(config.clone());
        game_b.register_player("holder", None);
        game_b.register_player("buyer", Some("holder"));
        game_b.buy_keys("holder", 10);
        game_b.buy_keys("buyer", 5);
        let div_pool_with_ref = game_b.total_dividend_pool;
        let winner_pot_with_ref = game_b.winner_pot;

        // With referral, pot_contribution is smaller, so dividends and winner pot are smaller
        assert!(
            div_pool_with_ref < div_pool_no_ref,
            "Dividend pool should be smaller with referral: {} < {}",
            div_pool_with_ref,
            div_pool_no_ref,
        );
        assert!(
            winner_pot_with_ref < winner_pot_no_ref,
            "Winner pot should be smaller with referral: {} < {}",
            winner_pot_with_ref,
            winner_pot_no_ref,
        );

        // But referrer earns referral bonus to compensate
        let holder_ref_earnings = game_b.players["holder"].referral_earnings;
        assert!(holder_ref_earnings > 0);
    }

    #[test]
    fn scenario_referral_bonus_on_subsequent_buys() {
        let mut game = GameSim::new(default_config());

        game.register_player("referrer", None);
        game.register_player("buyer", Some("referrer"));
        game.buy_keys("referrer", 5);
        game.buy_keys("buyer", 3);

        let ref_earnings_after_first = game.players["referrer"].referral_earnings;

        // Second buy by same buyer -- referral should still earn
        game.buy_keys("buyer", 5);
        let ref_earnings_after_second = game.players["referrer"].referral_earnings;

        assert!(
            ref_earnings_after_second > ref_earnings_after_first,
            "Referrer should earn on subsequent buys: first={} second={}",
            ref_earnings_after_first,
            ref_earnings_after_second,
        );
    }

    #[test]
    fn scenario_no_referral_full_pot_contribution() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.buy_keys("alice", 10);
        let (cost_bob, fee_bob) = game.buy_keys("bob", 5);

        // Without referral, full after_fee goes to pot_contribution
        let after_fee = cost_bob - fee_bob;
        let expected_dividend =
            math::calculate_bps_split(after_fee, game.config.dividend_bps).unwrap();

        // Total dividend pool includes dividends from both buys
        // But just check that bob's buy contributed the full dividend
        let (cost_alice, fee_alice) = {
            let c = math::calculate_cost(0, 10, game.config.base_price, game.config.price_increment).unwrap();
            let f = math::calculate_bps_split(c, game.config.protocol_fee_bps).unwrap();
            (c, f)
        };
        let alice_after = cost_alice - fee_alice;
        let alice_div = math::calculate_bps_split(alice_after, game.config.dividend_bps).unwrap();

        assert_eq!(
            game.total_dividend_pool,
            alice_div + expected_dividend,
            "Full dividends without referral",
        );
    }

    // --- 5. Winner Claim Mechanics ---

    #[test]
    fn scenario_winner_claims_full_pot() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.register_player("carol", None);
        game.buy_keys("alice", 5);
        game.buy_keys("bob", 3);
        game.buy_keys("carol", 10); // carol is last buyer

        let winner_pot_before = game.winner_pot;
        assert!(winner_pot_before > 0);

        game.end_round();

        // Carol claims as winner
        let payout = game.claim("carol");

        // Payout includes winner_pot + carol's dividend share
        let carol_dividends = game.players["carol"].claimed_dividends;
        assert_eq!(
            payout,
            winner_pot_before + carol_dividends,
            "Winner should get pot + dividends",
        );
    }

    #[test]
    fn scenario_winner_pot_accumulates_correctly() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.register_player("carol", None);

        let mut expected_winner_pot = 0u64;

        let (cost1, fee1) = game.buy_keys("alice", 5);
        let pot_contrib1 = cost1 - fee1; // no referrer
        expected_winner_pot +=
            math::calculate_bps_split(pot_contrib1, game.config.winner_bps).unwrap();

        let (cost2, fee2) = game.buy_keys("bob", 3);
        let pot_contrib2 = cost2 - fee2;
        expected_winner_pot +=
            math::calculate_bps_split(pot_contrib2, game.config.winner_bps).unwrap();

        let (cost3, fee3) = game.buy_keys("carol", 7);
        let pot_contrib3 = cost3 - fee3;
        expected_winner_pot +=
            math::calculate_bps_split(pot_contrib3, game.config.winner_bps).unwrap();

        assert_eq!(
            game.winner_pot, expected_winner_pot,
            "Winner pot mismatch: got={} expected={}",
            game.winner_pot, expected_winner_pot,
        );
    }

    // --- 6. Cross-Round Settlement with Carry-Over ---

    #[test]
    fn scenario_round_rollover_with_carry() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);

        let carry_over = game.next_round_pot;
        assert!(carry_over > 0, "Should have next_round_pot");

        // End round, claim everything
        game.end_round();
        let _alice_payout = game.claim("alice");
        let _bob_payout = game.claim("bob"); // bob is last buyer = winner

        assert!(game.winner_claimed);

        // Vault should have enough for carry-over
        let vault_remaining = game.vault_balance;
        assert!(
            vault_remaining >= carry_over,
            "Vault must have enough for carry: vault={} carry={}",
            vault_remaining,
            carry_over,
        );

        // New round
        let mut game2 = GameSim::new_with_carry(default_config(), carry_over, 2);
        assert_eq!(game2.pot_lamports, carry_over);
        assert_eq!(game2.vault_balance, carry_over);
        assert_eq!(game2.round, 2);

        game2.register_player("carol", None);
        game2.buy_keys("carol", 3);
        assert_eq!(game2.total_keys, 3);
        assert!(game2.pot_lamports > carry_over);
    }

    #[test]
    fn scenario_empty_round_rollover() {
        let game = GameSim::new(default_config());

        // Nobody buys anything
        assert_eq!(game.total_keys, 0);
        assert_eq!(game.next_round_pot, 0);

        // Can start new round with 0 carry
        let game2 = GameSim::new_with_carry(default_config(), 0, 2);
        assert_eq!(game2.pot_lamports, 0);
        assert_eq!(game2.vault_balance, 0);
    }

    #[test]
    fn scenario_multi_round_lifecycle() {
        let config = default_config();

        // Round 1
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.register_player("bob", None);
        game1.register_player("carol", None);
        game1.buy_keys("alice", 10);
        game1.buy_keys("bob", 5);
        game1.buy_keys("carol", 3);

        game1.end_round();

        // Everyone claims
        let _ = game1.claim("alice");
        let _ = game1.claim("carol");
        // Bob is last buyer = winner (actually carol is last, but let's check)
        // carol was last buyer in round 1
        // alice and carol already claimed as non-winners, bob claims
        let _ = game1.claim("bob");
        // carol was actually last buyer -- fix: only last buyer can be winner
        // In the claim logic, carol would be the winner since she bought last

        let carry1 = game1.next_round_pot;

        // Round 2
        let mut game2 = GameSim::new_with_carry(config.clone(), carry1, 2);
        game2.register_player("dave", None);
        game2.register_player("alice", None);
        game2.register_player("eve", None);
        game2.buy_keys("dave", 20);
        game2.buy_keys("alice", 5);
        game2.buy_keys("eve", 10);

        game2.end_round();

        if game2.pending_dividends("dave") > 0 {
            let _ = game2.claim("dave");
        }
        if game2.pending_dividends("alice") > 0 {
            let _ = game2.claim("alice");
        }
        let _ = game2.claim("eve"); // eve is last buyer = winner

        let carry2 = game2.next_round_pot;

        // Round 3
        let mut game3 = GameSim::new_with_carry(config.clone(), carry2, 3);
        game3.register_player("frank", None);
        game3.buy_keys("frank", 15);
        assert_eq!(game3.round, 3);
        assert!(game3.pot_lamports > carry2);

        // Solvency check each round
        for (i, g) in [&game1, &game2, &game3].iter().enumerate() {
            let (owed, vault) = g.solvency_check();
            println!(
                "Round {}: owed={} vault={} diff={}",
                i + 1,
                owed,
                vault,
                vault as i64 - owed as i64,
            );
        }
    }

    // --- 7. Economic Invariant: total_deposited == total_withdrawn + vault_balance + total_protocol_fees ---

    #[test]
    fn scenario_economic_invariant_all_funds_accounted() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", Some("alice"));
        game.register_player("carol", None);
        game.register_player("dave", Some("alice"));
        game.register_player("eve", None);

        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);
        game.buy_keys("carol", 8);
        game.buy_keys("dave", 3);
        game.buy_keys("eve", 12);
        game.buy_keys("bob", 7);
        game.buy_keys("carol", 4);

        let (owed, vault) = game.solvency_check();

        // Vault must cover all obligations
        assert!(
            vault >= owed,
            "Economic invariant violated: owed={} vault={} shortfall={}",
            owed,
            vault,
            owed.saturating_sub(vault),
        );

        // The maximum rounding dust should be bounded
        let dust = vault - owed;
        assert!(
            dust <= 10,
            "Excess dust in vault: {} (expected <= 10)",
            dust,
        );
    }

    #[test]
    fn scenario_total_flows_balance() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.register_player("carol", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);
        game.buy_keys("carol", 3);

        game.end_round();

        // Claim everything
        let alice_div = game.claim("alice");
        let carol_div = game.claim("carol");
        // Bob is not last buyer (carol is), so bob claims as non-winner
        let bob_total = game.claim("bob");

        let total_claimed = alice_div + carol_div + bob_total;
        let remaining = game.vault_balance;

        let vault_received = game.total_deposited - game.total_protocol_fees;
        let vault_outflows = total_claimed + remaining;

        assert_eq!(
            vault_received, vault_outflows,
            "Vault inflows ({}) must equal outflows ({}) + remaining ({})",
            vault_received, total_claimed, remaining,
        );
    }

    // --- 8. Edge Cases ---

    #[test]
    fn scenario_single_player_is_winner() {
        let mut game = GameSim::new(default_config());

        game.register_player("whale", None);
        game.buy_keys("whale", 1000);

        game.end_round();

        // Whale is only player and last buyer = winner
        let payout = game.claim("whale");
        assert!(payout > 0);

        // Vault should have next_round_pot remaining (+ dust)
        let (owed, vault) = game.solvency_check();
        assert!(vault >= owed);
        assert_eq!(owed, game.next_round_pot);
    }

    #[test]
    fn scenario_many_players_equal_keys() {
        let mut game = GameSim::new(default_config());

        let n = 20;
        for i in 0..n {
            game.register_player(&format!("p{}", i), None);
        }
        for i in 0..n {
            game.buy_keys(&format!("p{}", i), 5);
        }

        assert_eq!(game.total_keys, n as u64 * 5);

        game.end_round();

        // Each player should get an equal share
        let pool = game.total_dividend_pool;
        for i in 0..n {
            let pending = game.pending_dividends(&format!("p{}", i));
            let expected = (5u128 * pool as u128 / (n as u64 * 5) as u128) as u64;
            assert!(
                pending.abs_diff(expected) <= 1,
                "p{}: pending={} expected={}",
                i,
                pending,
                expected,
            );
        }

        let (owed, vault) = game.solvency_check();
        assert!(vault >= owed);
    }

    #[test]
    fn scenario_large_key_counts() {
        let mut game = GameSim::new(default_config());

        game.register_player("whale", None);
        game.register_player("minnow", None);
        game.buy_keys("whale", 10000);
        game.buy_keys("minnow", 1);

        game.end_round();

        let whale_share = game.pending_dividends("whale");
        let minnow_share = game.pending_dividends("minnow");

        // Whale has 10000/10001 of pool, minnow has 1/10001
        assert!(whale_share > minnow_share * 9000);

        let (owed, vault) = game.solvency_check();
        assert!(vault >= owed);
    }

    // --- 9. Double-Claim Prevention (current_round = 0 after claim) ---

    #[test]
    fn scenario_double_claim_prevented() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);

        game.end_round();

        // Alice claims
        let payout1 = game.claim("alice");
        assert!(payout1 > 0);

        // After claim, alice's current_round = 0, keys = 0
        assert_eq!(game.players["alice"].current_round, 0);
        assert_eq!(game.players["alice"].keys, 0);

        // Trying to check pending with 0 keys gives 0
        let pending = game.pending_dividends("alice");
        assert_eq!(pending, 0, "Should have 0 pending after claim");
    }

    #[test]
    fn scenario_claimed_player_cannot_buy_in_same_round() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);

        game.end_round();
        game.claim("alice");

        // Alice's current_round is now 0, which != game.round (1)
        // So buy_keys should panic
        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            game.buy_keys("alice", 1);
        }));
        assert!(result.is_err(), "Should not be able to buy after claiming");
    }

    // --- 10. Auto-End Behavior ---

    #[test]
    fn scenario_auto_end_sets_inactive() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.buy_keys("alice", 5);

        assert!(game.active);
        game.end_round();
        assert!(!game.active);
    }

    #[test]
    fn scenario_cannot_buy_after_end() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.buy_keys("alice", 5);

        game.end_round();

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            game.buy_keys("alice", 1);
        }));
        assert!(result.is_err(), "Should not be able to buy after round ends");
    }

    // --- 11. Protocol Fee Accounting ---

    #[test]
    fn scenario_protocol_fee_splits() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        let (cost, protocol_fee) = game.buy_keys("alice", 10);

        // Protocol fee should be 2% of cost
        let expected_fee = math::calculate_bps_split(cost, 200).unwrap();
        assert_eq!(protocol_fee, expected_fee);

        // Vault receives cost - protocol_fee
        assert_eq!(game.vault_balance, cost - protocol_fee);

        // Protocol fees tracked
        assert_eq!(game.protocol_fees_collected, protocol_fee);
    }

    #[test]
    fn scenario_protocol_fee_cumulative() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        let mut total_fees = 0u64;
        for _ in 0..20 {
            let (_, fee) = game.buy_keys("alice", 1);
            total_fees += fee;
        }

        assert_eq!(game.protocol_fees_collected, total_fees);
        assert!(total_fees > 0);
    }

    // --- 12. Bonding Curve Progression ---

    #[test]
    fn scenario_bonding_curve_prices_increase() {
        let config = default_config();
        let mut prices = Vec::new();

        for supply in (0..1000).step_by(100) {
            let cost = math::calculate_cost(supply, 1, config.base_price, config.price_increment)
                .unwrap();
            prices.push(cost);
        }

        for i in 1..prices.len() {
            assert!(
                prices[i] > prices[i - 1],
                "Price should increase: supply={} price={} prev={}",
                i * 100,
                prices[i],
                prices[i - 1],
            );
        }
    }

    #[test]
    fn scenario_bonding_curve_at_100k_keys() {
        let config = default_config();
        let cost =
            math::calculate_cost(100_000, 100, config.base_price, config.price_increment).unwrap();
        assert!(cost > 0);
        assert!(cost < u64::MAX / 2);

        let cost_single =
            math::calculate_cost(100_000, 1, config.base_price, config.price_increment).unwrap();
        assert!(cost_single > config.base_price);
    }

    // --- 13. Referral Edge Cases ---

    #[test]
    fn scenario_referral_no_self_referral() {
        let mut game = GameSim::new(default_config());

        let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            game.register_player("alice", Some("alice"));
        }));
        assert!(result.is_err(), "Should not allow self-referral");
    }

    #[test]
    fn scenario_referral_earnings_survive_round_end() {
        let mut game = GameSim::new(default_config());

        game.register_player("referrer", None);
        game.register_player("buyer", Some("referrer"));
        game.buy_keys("referrer", 10);
        game.buy_keys("buyer", 5);

        let ref_earnings = game.players["referrer"].referral_earnings;
        assert!(ref_earnings > 0);

        // End round: referral earnings are still there
        game.end_round();
        assert_eq!(
            game.players["referrer"].referral_earnings, ref_earnings,
            "Referral earnings should survive round end",
        );
    }

    #[test]
    fn scenario_multiple_referrals_to_same_referrer() {
        let mut game = GameSim::new(default_config());

        game.register_player("referrer", None);
        game.register_player("buyer1", Some("referrer"));
        game.register_player("buyer2", Some("referrer"));
        game.register_player("buyer3", Some("referrer"));
        game.buy_keys("referrer", 5);

        game.buy_keys("buyer1", 3);
        let earnings_1 = game.players["referrer"].referral_earnings;

        game.buy_keys("buyer2", 4);
        let earnings_2 = game.players["referrer"].referral_earnings;

        game.buy_keys("buyer3", 2);
        let earnings_3 = game.players["referrer"].referral_earnings;

        assert!(earnings_2 > earnings_1, "Should earn from buyer2");
        assert!(earnings_3 > earnings_2, "Should earn from buyer3");
    }

    // --- 14. Solvency Under Various Conditions ---

    #[test]
    fn scenario_solvency_all_claims_leave_carry_over() {
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", None);
        game.register_player("carol", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);
        game.buy_keys("carol", 3);

        game.end_round();

        // Everyone claims
        game.claim("alice");
        game.claim("bob");
        game.claim("carol"); // carol is last buyer = winner

        // What's left should be >= next_round_pot
        assert!(
            game.vault_balance >= game.next_round_pot,
            "Vault should have enough for carry-over: vault={} carry={}",
            game.vault_balance,
            game.next_round_pot,
        );
    }

    #[test]
    fn scenario_solvency_with_referrals() {
        let mut game = GameSim::new(default_config());

        game.register_player("ref1", None);
        game.register_player("ref2", None);
        game.register_player("p1", Some("ref1"));
        game.register_player("p2", Some("ref2"));
        game.register_player("p3", Some("ref1"));
        game.register_player("p4", Some("ref2"));
        game.register_player("p5", None);
        game.buy_keys("ref1", 5);
        game.buy_keys("ref2", 3);
        game.buy_keys("p1", 4);
        game.buy_keys("p2", 6);
        game.buy_keys("p3", 2);
        game.buy_keys("p4", 8);
        game.buy_keys("p5", 1);

        // Claim all referral earnings
        if game.players["ref1"].referral_earnings > 0 {
            game.claim_referral("ref1");
        }
        if game.players["ref2"].referral_earnings > 0 {
            game.claim_referral("ref2");
        }

        game.end_round();

        // Claim all dividends
        for name in ["ref1", "ref2", "p1", "p2", "p3", "p4"] {
            if game.pending_dividends(name) > 0 {
                game.claim(name);
            }
        }

        // p5 is last buyer = winner
        game.claim("p5");

        assert!(
            game.vault_balance >= game.next_round_pot,
            "Vault insolvent after full referral game: vault={} carry={}",
            game.vault_balance,
            game.next_round_pot,
        );
    }

    // --- 15. Config Variations ---

    #[test]
    fn scenario_high_winner_bps() {
        let mut config = default_config();
        config.winner_bps = 9000;
        config.dividend_bps = 800;
        config.next_round_bps = 200;

        let mut game = GameSim::new(config);
        game.register_player("alice", None);
        game.register_player("bob", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);

        let (owed, vault) = game.solvency_check();
        assert!(vault >= owed);

        game.end_round();
        let payout = game.claim("bob"); // bob is last buyer = winner
        assert!(payout > 0);
    }

    #[test]
    fn scenario_zero_next_round_bps() {
        let mut config = default_config();
        config.winner_bps = 5200;
        config.dividend_bps = 4800;
        config.next_round_bps = 0;

        let mut game = GameSim::new(config);
        game.register_player("alice", None);
        game.register_player("bob", None);
        game.buy_keys("alice", 5);
        game.buy_keys("bob", 3);

        assert_eq!(game.next_round_pot, 0, "No next round carry with 0 bps");
    }

    #[test]
    fn scenario_zero_protocol_fee() {
        let mut config = default_config();
        config.protocol_fee_bps = 0;

        let mut game = GameSim::new(config);
        game.register_player("alice", None);
        let (cost, fee) = game.buy_keys("alice", 10);

        assert_eq!(fee, 0, "Protocol fee should be 0");
        assert_eq!(game.vault_balance, cost, "Full cost goes to vault");
    }

    // --- 16. Mixed Referral and Non-Referral Players ---

    #[test]
    fn scenario_mixed_referral_and_direct_players() {
        let mut game = GameSim::new(default_config());

        game.register_player("referrer", None);
        game.register_player("direct1", None);
        game.register_player("referred1", Some("referrer"));
        game.register_player("direct2", None);
        game.register_player("referred2", Some("referrer"));
        game.register_player("direct3", None);

        game.buy_keys("referrer", 10);
        game.buy_keys("direct1", 5);
        game.buy_keys("referred1", 3);
        game.buy_keys("direct2", 4);
        game.buy_keys("referred2", 6);
        game.buy_keys("direct3", 2);

        let ref_earnings = game.players["referrer"].referral_earnings;
        assert!(ref_earnings > 0);

        let (owed, vault) = game.solvency_check();
        assert!(vault >= owed, "INSOLVENT with mixed referrals");
    }

    // --- 17. Whale vs Minnows ---

    #[test]
    fn scenario_whale_versus_minnows() {
        let mut game = GameSim::new(default_config());

        game.register_player("whale", None);
        for i in 0..50 {
            game.register_player(&format!("minnow_{}", i), None);
        }

        game.buy_keys("whale", 1000);
        for i in 0..50 {
            game.buy_keys(&format!("minnow_{}", i), 1);
        }

        game.end_round();

        let whale_pending = game.pending_dividends("whale");
        assert!(whale_pending > 0);

        let minnow_pending = game.pending_dividends("minnow_49");
        if minnow_pending > 0 {
            let ratio = whale_pending / minnow_pending;
            assert!(
                ratio > 500,
                "Whale should get much more than minnow: ratio={}",
                ratio,
            );
        }

        let (owed, vault) = game.solvency_check();
        assert!(vault >= owed);
    }

    // --- 18. Large Pot Simulation ---

    #[test]
    fn scenario_large_pot_100_buys() {
        let mut game = GameSim::new(default_config());

        for p in 0..10 {
            let name = format!("player_{}", p);
            game.register_player(&name, None);
        }

        for round in 0..10 {
            for p in 0..10 {
                let name = format!("player_{}", p);
                game.buy_keys(&name, 1 + (round % 5) as u64);
            }
        }

        assert!(game.total_keys > 100);
        assert!(game.pot_lamports > 0);

        let (owed, vault) = game.solvency_check();
        assert!(
            vault >= owed,
            "INSOLVENT after 100 buys: owed={} vault={} shortfall={}",
            owed,
            vault,
            owed.saturating_sub(vault),
        );
    }

    #[test]
    fn scenario_large_pot_500_buys_stress() {
        let mut game = GameSim::new(default_config());

        for p in 0..50 {
            let name = format!("p{}", p);
            game.register_player(&name, None);
        }

        for round in 0..10 {
            for p in 0..50 {
                let name = format!("p{}", p);
                let keys = 1 + ((p + round * 7) % 5) as u64;
                game.buy_keys(&name, keys);
            }
        }

        let (owed, vault) = game.solvency_check();
        assert!(
            vault >= owed,
            "INSOLVENT after 500 buys: owed={} vault={} shortfall={}",
            owed,
            vault,
            owed.saturating_sub(vault),
        );

        // End round, all players claim
        game.end_round();
        let mut total_claimed = 0u64;
        for p in 0..50 {
            let name = format!("p{}", p);
            let pending = game.pending_dividends(&name);
            if pending > 0 {
                total_claimed += game.claim(&name);
            }
        }
        assert!(total_claimed > 0);

        // Vault should still be solvent for next_round carry
        let (owed2, vault2) = game.solvency_check();
        assert!(
            vault2 >= owed2,
            "INSOLVENT after claims: owed={} vault={}",
            owed2,
            vault2,
        );
    }

    // --- 19. Dust Accumulation ---

    #[test]
    fn scenario_dust_bounded_per_transaction() {
        let mut game = GameSim::new(default_config());

        for p in 0..10 {
            let name = format!("p{}", p);
            game.register_player(&name, None);
        }

        for i in 0..100 {
            let name = format!("p{}", i % 10);
            game.buy_keys(&name, 1);
        }

        let (owed, vault) = game.solvency_check();
        let dust = vault.saturating_sub(owed);

        assert!(
            dust <= 100,
            "Dust should be <= num_transactions: dust={}",
            dust,
        );

        assert!(vault >= owed, "INSOLVENT: owed={} vault={}", owed, vault);
    }

    // --- 20. Timer Extension ---

    #[test]
    fn scenario_timer_never_decreases() {
        let config = default_config();
        let mut timer_end = 1000i64 + config.max_timer_secs;
        let round_start = 1000i64;

        for time in (1000..5000).step_by(10) {
            let new_end = math::calculate_timer_extension(
                time,
                config.timer_extension_secs,
                timer_end,
                round_start,
                config.max_timer_secs,
            )
            .unwrap();

            assert!(
                new_end >= timer_end,
                "Timer decreased: old={} new={} time={}",
                timer_end,
                new_end,
                time,
            );
            timer_end = new_end;
        }
    }

    // --- 21. Cross-Round Claim and Transition ---

    #[test]
    fn scenario_claim_and_move_to_new_round() {
        let config = default_config();

        // Round 1: alice and bob play
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.register_player("bob", None);
        game1.buy_keys("alice", 10);
        game1.buy_keys("bob", 5);

        // End round, both claim
        game1.end_round();
        game1.claim("alice");
        game1.claim("bob"); // bob is last buyer = winner

        let carry = game1.next_round_pot;

        // Round 2
        let mut game2 = GameSim::new_with_carry(config.clone(), carry, 2);

        // Alice moves to round 2 (already claimed, current_round == 0)
        game1.move_player_to("alice", &mut game2);

        // Alice's state is now in round 2
        assert_eq!(game2.players["alice"].current_round, 2);
        assert_eq!(game2.players["alice"].keys, 0);
        assert_eq!(game2.total_players, 1);

        // Alice can now buy keys in round 2
        game2.buy_keys("alice", 7);
        assert_eq!(game2.players["alice"].keys, 7);
    }

    #[test]
    fn scenario_claim_dividends_then_move() {
        let config = default_config();

        // Round 1: alice plays, claims dividends, moves to round 2
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.register_player("bob", None);
        game1.register_player("carol", None);
        game1.buy_keys("alice", 10);
        game1.buy_keys("bob", 5);
        game1.buy_keys("carol", 3);

        // End round
        game1.end_round();
        let alice_pending = game1.pending_dividends("alice");
        assert!(alice_pending > 0, "Alice should have pending dividends");

        // All claim
        game1.claim("carol"); // carol is last buyer = winner
        game1.claim("bob");
        let alice_payout = game1.claim("alice");
        assert!(alice_payout > 0, "Alice should get dividends from claim");

        let carry = game1.next_round_pot;

        // Round 2
        let mut game2 = GameSim::new_with_carry(config.clone(), carry, 2);

        // Alice moves to round 2 (already claimed)
        game1.move_player_to("alice", &mut game2);

        assert_eq!(game2.players["alice"].current_round, 2);
        assert_eq!(game2.players["alice"].keys, 0);
    }

    #[test]
    fn scenario_referrer_claims_then_moves() {
        let config = default_config();

        // Round 1: referrer earns referral fees
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("referrer", None);
        game1.register_player("buyer", Some("referrer"));
        game1.buy_keys("referrer", 10);
        game1.buy_keys("buyer", 5);

        let ref_earnings = game1.players["referrer"].referral_earnings;
        assert!(ref_earnings > 0);

        // End round
        game1.end_round();
        game1.claim("buyer"); // buyer is last buyer = winner

        // Referrer claims dividends
        let div = game1.claim("referrer");
        assert!(div > 0, "Referrer should have dividends");

        // Referrer claims referral earnings separately
        let ref_claimed = game1.claim_referral("referrer");
        assert_eq!(ref_claimed, ref_earnings, "Referrer should get full referral earnings");

        let carry = game1.next_round_pot;

        // Round 2
        let mut game2 = GameSim::new_with_carry(config.clone(), carry, 2);

        // Referrer moves to round 2 (already claimed)
        game1.move_player_to("referrer", &mut game2);

        assert_eq!(game2.players["referrer"].current_round, 2);
        assert_eq!(game2.players["referrer"].referral_earnings, 0);
    }

    #[test]
    fn scenario_referrer_carries_over_across_rounds() {
        let config = default_config();

        // Round 1: buyer sets referrer
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("referrer", None);
        game1.register_player("buyer", Some("referrer"));
        game1.buy_keys("referrer", 5);
        game1.buy_keys("buyer", 3);

        assert!(game1.players["buyer"].referrer.is_some());

        // End round
        game1.end_round();
        game1.claim("referrer");
        game1.claim("buyer"); // buyer is last buyer = winner

        let carry = game1.next_round_pot;

        // Round 2
        let mut game2 = GameSim::new_with_carry(config.clone(), carry, 2);
        game1.move_player_to("referrer", &mut game2);
        game1.move_player_to("buyer", &mut game2);

        // Buyer's referrer should still be set
        assert!(
            game2.players["buyer"].referrer.is_some(),
            "Referrer relationship should persist across rounds",
        );
        assert_eq!(
            game2.players["buyer"].referrer.as_deref(),
            Some("referrer"),
        );
    }

    #[test]
    fn scenario_zero_key_player_claim_fails() {
        let config = default_config();

        // Round 1: alice registers (0-key buy) but never buys real keys
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.register_player("bob", None);
        game1.buy_keys("bob", 10);
        game1.end_round();

        // Alice has 0 keys and is not winner — nothing to claim
        let alice_div = game1.pending_dividends("alice");
        assert_eq!(alice_div, 0, "Zero-key player should have zero dividends");

        // Bob (winner) claims normally
        game1.claim("bob");

        // Alice's current_round stays at 1 (can't claim, no payout)
        assert_eq!(game1.players["alice"].current_round, 1);
    }

    #[test]
    fn scenario_multi_round_lifetime_stats() {
        let config = default_config();

        // Round 1
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.register_player("bob", None);
        game1.buy_keys("alice", 10);
        game1.buy_keys("bob", 5);

        // End round, alice claims dividends (not winner)
        game1.end_round();
        let alice_div_r1 = game1.claim("alice");
        game1.claim("bob"); // bob = winner
        let carry = game1.next_round_pot;

        // Round 2
        let mut game2 = GameSim::new_with_carry(config.clone(), carry, 2);
        game1.move_player_to("alice", &mut game2);

        // Alice plays round 2
        game2.register_player("carol", None);
        game2.buy_keys("alice", 7);
        game2.buy_keys("carol", 3);

        game2.end_round();
        let alice_div_r2 = game2.claim("alice");

        // Alice's lifetime claimed_dividends should be sum of both rounds
        let lifetime = game2.players["alice"].claimed_dividends;
        assert_eq!(
            lifetime,
            alice_div_r1 + alice_div_r2,
            "Lifetime stats should accumulate: r1={} r2={} total={}",
            alice_div_r1,
            alice_div_r2,
            lifetime,
        );
    }

    #[test]
    fn scenario_skip_rounds() {
        let config = default_config();

        // Round 1
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.register_player("bob", None);
        game1.buy_keys("alice", 10);
        game1.buy_keys("bob", 5);
        game1.end_round();
        game1.claim("alice");
        game1.claim("bob"); // winner
        let carry1 = game1.next_round_pot;

        // Round 2 (alice skips this round)
        let mut game2 = GameSim::new_with_carry(config.clone(), carry1, 2);
        game2.register_player("carol", None);
        game2.buy_keys("carol", 10);
        game2.end_round();
        game2.claim("carol"); // winner
        let carry2 = game2.next_round_pot;

        // Round 3 (alice skips this too)
        let mut game3 = GameSim::new_with_carry(config.clone(), carry2, 3);
        game3.register_player("dave", None);
        game3.buy_keys("dave", 10);
        game3.end_round();
        game3.claim("dave"); // winner
        let carry3 = game3.next_round_pot;

        // Round 4: alice moves from round 1 to round 4 (she already claimed in R1)
        let mut game4 = GameSim::new_with_carry(config.clone(), carry3, 4);
        game1.move_player_to("alice", &mut game4);

        // Alice should be in round 4 now
        assert_eq!(game4.players["alice"].current_round, 4);
        assert_eq!(game4.players["alice"].keys, 0);

        // Alice can play in round 4
        game4.buy_keys("alice", 5);
        assert_eq!(game4.players["alice"].keys, 5);
    }

    // --- 22. Total Players Tracking ---

    #[test]
    fn scenario_total_players_counter() {
        let mut game = GameSim::new(default_config());

        assert_eq!(game.total_players, 0);

        game.register_player("alice", None);
        game.buy_keys("alice", 5);
        assert_eq!(game.total_players, 1);

        game.register_player("bob", None);
        game.buy_keys("bob", 3);
        assert_eq!(game.total_players, 2);

        // Alice buying again should NOT increment
        game.buy_keys("alice", 2);
        assert_eq!(game.total_players, 2);

        game.register_player("carol", None);
        game.buy_keys("carol", 1);
        assert_eq!(game.total_players, 3);
    }

    // --- 23. Solvency Across Multi-Round with Claims ---

    #[test]
    fn scenario_solvency_multi_round_with_claims() {
        let config = default_config();

        // Round 1: complex game
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.register_player("bob", Some("alice"));
        game1.register_player("carol", None);
        game1.register_player("dave", Some("alice"));
        game1.buy_keys("alice", 10);
        game1.buy_keys("bob", 5);
        game1.buy_keys("carol", 8);
        game1.buy_keys("dave", 3);

        // Claim referral
        game1.claim_referral("alice");

        game1.end_round();

        // All claim
        game1.claim("alice");
        game1.claim("bob");
        game1.claim("carol");
        game1.claim("dave"); // dave is last buyer = winner

        // Solvency check round 1
        let (owed1, vault1) = game1.solvency_check();
        assert!(vault1 >= owed1, "Round 1 insolvent");

        let carry = game1.next_round_pot;

        // Round 2: players move over after claiming
        let mut game2 = GameSim::new_with_carry(config.clone(), carry, 2);
        game1.move_player_to("alice", &mut game2);
        game1.move_player_to("bob", &mut game2);

        // New players join round 2
        game2.register_player("eve", None);
        game2.buy_keys("alice", 5);
        game2.buy_keys("bob", 3);
        game2.buy_keys("eve", 10);

        // Solvency check round 2
        let (owed2, vault2) = game2.solvency_check();
        assert!(vault2 >= owed2, "Round 2 insolvent");

        // End round 2, everyone claims
        game2.end_round();
        game2.claim("alice");
        game2.claim("bob");
        game2.claim("eve"); // eve is last buyer = winner

        assert!(
            game2.vault_balance >= game2.next_round_pot,
            "Round 2 vault should cover carry-over",
        );
    }

    // --- 24. Carry-Over in Empty Round ---

    #[test]
    fn scenario_carry_over_survives_empty_round() {
        let config = default_config();

        // Round 1: normal game generates carry-over
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.register_player("bob", None);
        game1.buy_keys("alice", 10);
        game1.buy_keys("bob", 5);
        game1.end_round();
        game1.claim("alice");
        game1.claim("bob");

        let carry1 = game1.next_round_pot;
        assert!(carry1 > 0, "Round 1 should have carry-over");

        // Round 2: empty round. Carry-over seeded into winner_pot.
        let game2 = GameSim::new_with_carry(config.clone(), carry1, 2);
        assert_eq!(game2.winner_pot, carry1, "Carry-over should be in winner_pot");

        // Forward full vault balance to round 3
        let carry2 = game2.vault_balance;
        assert_eq!(carry2, carry1, "Empty round should forward full vault balance");

        // Round 3: someone buys, carry-over is claimable
        let mut game3 = GameSim::new_with_carry(config.clone(), carry2, 3);
        assert_eq!(game3.winner_pot, carry2);

        game3.register_player("carol", None);
        let (cost3, fee3) = game3.buy_keys("carol", 5);

        // Carol's buy contributes winner split from pot_contribution
        let pot_contrib = cost3 - fee3;
        let winner_split = math::calculate_bps_split(pot_contrib, config.winner_bps).unwrap();
        let div_split = math::calculate_bps_split(pot_contrib, config.dividend_bps).unwrap();

        assert_eq!(
            game3.winner_pot,
            carry2 + winner_split,
            "Winner pot should be carry + winner split",
        );
        assert_eq!(game3.total_dividend_pool, div_split);

        // Carol claims as winner
        game3.end_round();
        let payout = game3.claim("carol");
        assert!(payout >= carry2, "Winner should receive at least the carry-over amount");

        let (owed, vault) = game3.solvency_check();
        assert!(vault >= owed, "Solvency after carry-over claim");
    }

    #[test]
    fn scenario_carry_over_through_multiple_empty_rounds() {
        let config = default_config();

        // Round 1: generate some carry-over
        let mut game1 = GameSim::new(config.clone());
        game1.register_player("alice", None);
        game1.buy_keys("alice", 20);
        game1.end_round();
        game1.claim("alice");
        let carry1 = game1.next_round_pot;
        assert!(carry1 > 0);

        // Rounds 2, 3, 4: all empty
        let game2 = GameSim::new_with_carry(config.clone(), carry1, 2);
        let carry2 = game2.vault_balance;
        assert_eq!(carry2, carry1);

        let game3 = GameSim::new_with_carry(config.clone(), carry2, 3);
        let carry3 = game3.vault_balance;
        assert_eq!(carry3, carry1);

        let game4 = GameSim::new_with_carry(config.clone(), carry3, 4);
        let carry4 = game4.vault_balance;
        assert_eq!(carry4, carry1, "Carry-over should survive through 3 empty rounds");

        // Round 5: finally someone buys
        let mut game5 = GameSim::new_with_carry(config.clone(), carry4, 5);
        game5.register_player("winner", None);
        game5.buy_keys("winner", 1);
        game5.end_round();
        let payout = game5.claim("winner");
        assert!(payout >= carry1, "Winner should get carry-over from round 1");
    }

    // --- 25. Claim Ordering Independence ---

    #[test]
    fn scenario_claim_order_does_not_affect_total() {
        let config = default_config();

        // Run the same game twice, claim in different orders, verify same total payout
        let run_game = |claim_order: &[&str]| -> u64 {
            let mut game = GameSim::new(config.clone());
            game.register_player("alice", None);
            game.register_player("bob", None);
            game.register_player("carol", None);
            game.register_player("dave", None);
            game.buy_keys("alice", 10);
            game.buy_keys("bob", 5);
            game.buy_keys("carol", 8);
            game.buy_keys("dave", 3);

            game.buy_keys("alice", 3);
            game.buy_keys("bob", 7);
            game.buy_keys("carol", 2);

            game.end_round();

            let mut total = 0u64;
            for name in claim_order {
                if game.pending_dividends(name) > 0 || *name == game.last_buyer {
                    total += game.claim(name);
                }
            }
            total
        };

        let total_abc = run_game(&["alice", "bob", "carol", "dave"]);
        let total_dcba = run_game(&["dave", "carol", "bob", "alice"]);
        let total_bdac = run_game(&["bob", "dave", "alice", "carol"]);

        assert_eq!(
            total_abc, total_dcba,
            "Claim order A->D vs D->A should give same total: {} vs {}",
            total_abc, total_dcba,
        );
        assert_eq!(
            total_abc, total_bdac,
            "Claim order A->D vs B->D->A->C should give same total: {} vs {}",
            total_abc, total_bdac,
        );
    }

    // --- 26. Full Drain Test ---

    #[test]
    fn scenario_full_drain_vault_equals_carry_plus_dust() {
        let config = default_config();
        let mut game = GameSim::new(config.clone());

        game.register_player("alice", None);
        game.register_player("bob", Some("alice"));
        game.register_player("carol", None);
        game.register_player("dave", Some("alice"));
        game.register_player("eve", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);
        game.buy_keys("carol", 8);
        game.buy_keys("dave", 3);
        game.buy_keys("bob", 4);
        game.buy_keys("alice", 7);
        game.buy_keys("carol", 2);
        game.buy_keys("eve", 12); // Eve buys LAST = winner

        // Claim ALL referral earnings
        if game.players["alice"].referral_earnings > 0 {
            game.claim_referral("alice");
        }

        game.end_round();

        // Claim ALL dividends for non-winners
        for name in ["alice", "bob", "carol", "dave"] {
            if game.pending_dividends(name) > 0 {
                game.claim(name);
            }
        }

        // Eve is last buyer = winner
        let eve_payout = game.claim("eve");
        assert!(eve_payout > 0);

        // After all claims, vault should hold exactly next_round_pot + dust
        let remaining = game.vault_balance;
        let next_round = game.next_round_pot;

        assert!(
            remaining >= next_round,
            "Vault should hold at least next_round_pot: remaining={} next_round={}",
            remaining, next_round,
        );

        let dust = remaining - next_round;
        // Dust should be bounded: at most ~4 lamports per transaction (8 buys = ~32 max)
        // plus up to 1 lamport per player from dividend share rounding (5 players)
        assert!(
            dust <= 40,
            "Dust after full drain should be bounded: dust={} (8 buys, expected <= 40)",
            dust,
        );

        // Conservation: total_deposited == total_withdrawn + vault_balance + protocol_fees
        let total_out = game.total_withdrawn + game.vault_balance + game.total_protocol_fees;
        assert_eq!(
            total_out, game.total_deposited,
            "Conservation violated: deposited={} out={}",
            game.total_deposited, total_out,
        );
    }

    // --- 27. Referrer-as-Winner (Triple Payout) ---

    #[test]
    fn scenario_referrer_is_winner_gets_all_three_streams() {
        let config = default_config();
        let mut game = GameSim::new(config.clone());

        // Alice is referrer, key holder, AND last buyer (winner)
        game.register_player("alice", None);
        game.register_player("bob", Some("alice"));
        game.register_player("carol", Some("alice"));
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);
        game.buy_keys("carol", 3);
        game.buy_keys("alice", 2); // alice buys again = last buyer

        let alice_referral = game.players["alice"].referral_earnings;
        let winner_pot = game.winner_pot;

        assert!(alice_referral > 0, "Alice should have referral earnings: {}", alice_referral);
        assert!(winner_pot > 0, "Winner pot should be > 0: {}", winner_pot);

        // Claim referral first
        let ref_claim = game.claim_referral("alice");
        assert_eq!(ref_claim, alice_referral);

        // End round, claim winner + dividends
        game.end_round();

        let alice_dividends = game.pending_dividends("alice");
        assert!(alice_dividends > 0, "Alice should have dividends: {}", alice_dividends);

        let winner_claim = game.claim("alice");
        assert!(winner_claim >= winner_pot, "Winner claim should include winner pot");

        // Total alice received = referral + winner claim (which includes dividends)
        let total_alice = ref_claim + winner_claim;
        assert!(total_alice > 0);

        let (owed, vault) = game.solvency_check();
        assert!(vault >= owed, "Solvency after triple claim");
    }

    // --- 28. Overflow Boundary Tests ---

    #[test]
    fn scenario_overflow_high_supply_cost() {
        let config = default_config();

        let cost = math::calculate_cost(1_000_000, 1, config.base_price, config.price_increment);
        assert!(cost.is_ok(), "Should handle 1M supply");
        let cost_val = cost.unwrap();
        assert!(cost_val > 1_000_000_000_000, "Cost should exceed 1000 SOL");
        assert!(cost_val < u64::MAX / 2, "Should be safely below u64::MAX");

        let batch_cost =
            math::calculate_cost(1_000_000, 1000, config.base_price, config.price_increment);
        assert!(batch_cost.is_ok(), "Should handle batch at 1M supply");
    }

    #[test]
    fn scenario_overflow_extreme_supply_returns_error() {
        let result = math::calculate_cost(
            u64::MAX / 2,
            u64::MAX / 2,
            10_000_000,
            1_000_000,
        );
        assert!(result.is_err(), "Extreme supply should overflow");
    }

    #[test]
    fn scenario_overflow_bps_split_near_max() {
        let large_amount = u64::MAX / 2;
        let result = math::calculate_bps_split(large_amount, 4800);
        assert!(result.is_ok(), "BPS split should handle large amounts");
        let split = result.unwrap();
        assert!(split > 0);
        assert!(split < large_amount);
    }

    #[test]
    fn scenario_overflow_dividend_share_large_values() {
        // Large pool with small total_keys
        let result = math::calculate_dividend_share(1, u64::MAX / 2, 1);
        assert!(result.is_ok(), "Should handle large pool with 1 key");
        assert_eq!(result.unwrap(), u64::MAX / 2);

        // Large total_keys
        let result2 = math::calculate_dividend_share(1, 1_000_000_000, u64::MAX / 2);
        assert!(result2.is_ok(), "Should handle large total_keys");
        let share = result2.unwrap();
        // With huge total_keys, each key's share is tiny
        assert!(share < 1_000_000_000);

        // Zero cases
        let result3 = math::calculate_dividend_share(0, 1_000_000_000, 100);
        assert!(result3.is_ok());
        assert_eq!(result3.unwrap(), 0);

        let result4 = math::calculate_dividend_share(50, 0, 100);
        assert!(result4.is_ok());
        assert_eq!(result4.unwrap(), 0);

        let result5 = math::calculate_dividend_share(50, 1_000_000_000, 0);
        assert!(result5.is_ok());
        assert_eq!(result5.unwrap(), 0);
    }

    // --- 29. BPS Split Rounding Across Full Range ---

    #[test]
    fn scenario_bps_splits_never_exceed_cost() {
        let config = default_config();

        for cost in [1, 100, 10_000, 1_000_000, 100_000_000, 10_000_000_000u64] {
            // New fee ordering: house fee first, then pot splits from pot_contribution
            let house_fee = math::calculate_bps_split(cost, config.protocol_fee_bps).unwrap();
            let after_fee = cost - house_fee;

            let winner = math::calculate_bps_split(after_fee, config.winner_bps).unwrap();
            let dividend = math::calculate_bps_split(after_fee, config.dividend_bps).unwrap();
            let next_round = math::calculate_bps_split(after_fee, config.next_round_bps).unwrap();

            let total = house_fee + winner + dividend + next_round;
            assert!(
                total <= cost,
                "BPS splits exceed cost at {}: total={} (h={} w={} d={} n={})",
                cost,
                total,
                house_fee,
                winner,
                dividend,
                next_round,
            );

            let dust = cost - total;
            assert!(
                dust <= 4,
                "Too much rounding dust at cost={}: dust={}",
                cost,
                dust,
            );
        }
    }

    #[test]
    fn scenario_bps_pot_splits_sum_equals_pot_contribution() {
        // winner_bps + dividend_bps + next_round_bps = 10000
        // So pot splits should sum to pot_contribution (with rounding)
        let config = default_config();

        for amount in [1_000_000_000u64, 980_000_000, 500_000, 100, 1] {
            let winner = math::calculate_bps_split(amount, config.winner_bps).unwrap();
            let dividend = math::calculate_bps_split(amount, config.dividend_bps).unwrap();
            let next_round = math::calculate_bps_split(amount, config.next_round_bps).unwrap();
            let total = winner + dividend + next_round;

            assert!(
                total <= amount,
                "Splits exceed amount {}: total={}",
                amount,
                total,
            );
            assert!(
                amount - total <= 2,
                "Too much dust at amount={}: dust={}",
                amount,
                amount - total,
            );
        }
    }

    // --- 30. Full Stress Test ---

    #[test]
    fn scenario_full_stress_test() {
        let mut game = GameSim::new(default_config());

        // Register all 20 players with their referral relationships
        for i in 0..20 {
            let referrer = if i > 5 && i % 3 == 0 {
                Some(format!("player_{}", i - 1))
            } else {
                None
            };
            game.register_player(
                &format!("player_{}", i),
                referrer.as_deref(),
            );
        }

        // Phase 1: 20 players buy
        for i in 0..20 {
            let keys = 1 + (i % 10) as u64;
            game.buy_keys(&format!("player_{}", i), keys);
        }

        // Phase 2: more buys
        for i in 0..20 {
            let keys = 2 + (i % 7) as u64;
            game.buy_keys(&format!("player_{}", i), keys);
        }

        // Phase 3: claim referral earnings
        for i in 0..20 {
            let name = format!("player_{}", i);
            if game.players[&name].referral_earnings > 0 {
                game.claim_referral(&name);
            }
        }

        // Phase 4: end round and claim dividends
        game.end_round();
        for i in 0..19 {
            let name = format!("player_{}", i);
            if game.pending_dividends(&name) > 0 {
                game.claim(&name);
            }
        }

        // Phase 5: last player (player_19) wins
        let winner_payout = game.claim("player_19");
        assert!(winner_payout > 0);

        // Final solvency
        assert!(
            game.vault_balance >= game.next_round_pot,
            "Vault must cover carry-over: vault={} carry={}",
            game.vault_balance,
            game.next_round_pot,
        );

        // Total accounting
        let total_out = game.total_withdrawn + game.vault_balance + game.total_protocol_fees;
        assert_eq!(
            total_out, game.total_deposited,
            "Total flows must balance: deposited={} out={}",
            game.total_deposited, total_out,
        );
    }

    // --- 31. Large-Scale Full Drain with Many Players ---

    #[test]
    fn scenario_full_lifecycle_100_players_full_drain() {
        let config = default_config();
        let mut game = GameSim::new(config.clone());

        let num_players = 100;

        // Register all players (some with referrals)
        game.register_player("p0", None);
        for i in 1..num_players {
            let referrer = if i % 5 == 0 { Some("p0") } else { None };
            game.register_player(&format!("p{}", i), referrer);
        }

        // Everyone buys 1-5 keys (varied)
        for i in 0..num_players {
            let keys = 1 + (i % 5) as u64;
            game.buy_keys(&format!("p{}", i), keys);
        }

        // Claim all referral earnings for p0
        if game.players["p0"].referral_earnings > 0 {
            game.claim_referral("p0");
        }

        game.end_round();

        // All non-winners claim dividends
        for i in 0..(num_players - 1) {
            let name = format!("p{}", i);
            if game.pending_dividends(&name) > 0 {
                game.claim(&name);
            }
        }

        // Last player wins
        let last = format!("p{}", num_players - 1);
        let winner_payout = game.claim(&last);
        assert!(winner_payout > 0);

        // Vault should be drained to just next_round_pot + bounded dust
        let remaining = game.vault_balance;
        let next_round = game.next_round_pot;
        assert!(remaining >= next_round);

        let dust = remaining - next_round;
        assert!(
            dust <= 500,
            "Dust after 100-player drain: {} (expected <= 500)",
            dust,
        );

        // Conservation
        let total_out = game.total_withdrawn + game.vault_balance + game.total_protocol_fees;
        assert_eq!(total_out, game.total_deposited, "Conservation violated");
    }

    // --- 32. Fee Ordering Conservation Tests ---

    #[test]
    fn scenario_fee_ordering_conserves_funds_with_referral() {
        let cost = 1_000_000_000u64; // 1 SOL

        // Step 1: House fee off the top
        let house_fee = math::calculate_bps_split(cost, 200).unwrap();
        let after_fee = cost - house_fee;

        // Step 2: Referral from after_fee
        let referral = math::calculate_bps_split(after_fee, 1000).unwrap();
        let pot_contribution = after_fee - referral;

        // Step 3: Pot splits
        let winner = math::calculate_bps_split(pot_contribution, 4800).unwrap();
        let dividend = math::calculate_bps_split(pot_contribution, 4500).unwrap();
        let next_round = math::calculate_bps_split(pot_contribution, 700).unwrap();

        // All pieces should sum to original cost
        let total = house_fee + referral + winner + dividend + next_round;
        assert_eq!(total, cost);
    }

    #[test]
    fn scenario_fee_ordering_conserves_funds_without_referral() {
        let cost = 1_000_000_000u64; // 1 SOL

        let house_fee = math::calculate_bps_split(cost, 200).unwrap();
        let pot_contribution = cost - house_fee; // full after_fee goes to pot

        let winner = math::calculate_bps_split(pot_contribution, 4800).unwrap();
        let dividend = math::calculate_bps_split(pot_contribution, 4500).unwrap();
        let next_round = math::calculate_bps_split(pot_contribution, 700).unwrap();

        let total = house_fee + winner + dividend + next_round;
        assert_eq!(total, cost);
    }

    #[test]
    fn scenario_fee_ordering_various_costs() {
        let costs = [1u64, 100, 999, 10_000_000, 1_000_000_000, 10_000_000_000];
        for cost in costs {
            let house_fee = math::calculate_bps_split(cost, 200).unwrap();
            let after_fee = cost - house_fee;
            let referral = math::calculate_bps_split(after_fee, 1000).unwrap();
            let pot = after_fee - referral;

            let winner = math::calculate_bps_split(pot, 4800).unwrap();
            let dividend = math::calculate_bps_split(pot, 4500).unwrap();
            let next_round = math::calculate_bps_split(pot, 700).unwrap();

            let accounted = house_fee + referral + winner + dividend + next_round;
            assert!(
                accounted <= cost,
                "Overcount at cost {}: accounted {}",
                cost,
                accounted,
            );
            // Rounding loss should be tiny (< 3 lamports from 3 division steps)
            assert!(
                cost - accounted <= 3,
                "Too much dust at cost {}: lost {}",
                cost,
                cost - accounted,
            );
        }
    }

    // --- 33. Round Numbering ---

    #[test]
    fn scenario_first_round_is_one() {
        let game = GameSim::new(default_config());
        assert_eq!(game.round, 1, "First round should be 1");
    }

    #[test]
    fn scenario_current_round_zero_means_not_in_round() {
        let mut game = GameSim::new(default_config());
        game.register_player("alice", None);
        game.buy_keys("alice", 5);

        assert_eq!(game.players["alice"].current_round, 1);

        game.end_round();
        game.claim("alice");

        assert_eq!(
            game.players["alice"].current_round, 0,
            "After claiming, current_round should be 0 (not in any round)",
        );
    }

    // --- 34. BPS Validation ---

    #[test]
    fn scenario_bps_validation_default() {
        // 4800 + 4500 + 700 = 10000
        let result = math::validate_bps_sum(
            DEFAULT_WINNER_BPS,
            DEFAULT_DIVIDEND_BPS,
            DEFAULT_NEXT_ROUND_BPS,
        );
        assert!(result.is_ok());
    }

    #[test]
    fn scenario_bps_validation_invalid_under() {
        let result = math::validate_bps_sum(4800, 4500, 600);
        assert!(result.is_err());
    }

    #[test]
    fn scenario_bps_validation_invalid_over() {
        let result = math::validate_bps_sum(5000, 4500, 700);
        assert!(result.is_err());
    }

    #[test]
    fn scenario_bps_validation_protocol_fee_is_separate() {
        // Protocol fee BPS is not included in the 3-param validation
        // winner + dividend + next_round must = 10000 regardless of protocol_fee
        let result = math::validate_bps_sum(4800, 4500, 700);
        assert!(result.is_ok());
    }

    // --- 35. Dividend Distribution Fairness ---

    #[test]
    fn scenario_dividend_distribution_fair_share() {
        let total_keys = 5u64;
        let dividend_pool = 1_000_000_000u64;

        let per_holder =
            math::calculate_dividend_share(1, dividend_pool, total_keys).unwrap();
        assert_eq!(per_holder, 200_000_000);

        let total_claimed =
            math::calculate_dividend_share(total_keys, dividend_pool, total_keys).unwrap();
        assert_eq!(total_claimed, dividend_pool);
    }

    #[test]
    fn scenario_dividend_rounding_dust() {
        // 3 holders with 1 key each, pool = 100 lamports
        // Each gets 33, total claimed = 99, dust = 1
        let s1 = math::calculate_dividend_share(1, 100, 3).unwrap();
        let s2 = math::calculate_dividend_share(1, 100, 3).unwrap();
        let s3 = math::calculate_dividend_share(1, 100, 3).unwrap();
        assert_eq!(s1, 33);
        assert_eq!(s2, 33);
        assert_eq!(s3, 33);
        assert_eq!(s1 + s2 + s3, 99); // 1 lamport dust
    }

    // --- 36. Vault Accounting Invariant ---

    #[test]
    fn scenario_vault_equals_obligations() {
        // vault_balance = winner_pot + total_dividend_pool + next_round_pot + unclaimed_referral_earnings
        let mut game = GameSim::new(default_config());

        game.register_player("alice", None);
        game.register_player("bob", Some("alice"));
        game.register_player("carol", None);
        game.buy_keys("alice", 10);
        game.buy_keys("bob", 5);
        game.buy_keys("carol", 8);

        let unclaimed_referral: u64 = game.players.values().map(|p| p.referral_earnings).sum();
        let expected_vault =
            game.winner_pot + game.total_dividend_pool + game.next_round_pot + unclaimed_referral;

        // Vault should be at least as much as obligations (might have rounding dust)
        assert!(
            game.vault_balance >= expected_vault,
            "Vault {} should >= obligations {}",
            game.vault_balance,
            expected_vault,
        );

        let dust = game.vault_balance - expected_vault;
        assert!(
            dust <= 10,
            "Vault dust should be small: {}",
            dust,
        );
    }
}
