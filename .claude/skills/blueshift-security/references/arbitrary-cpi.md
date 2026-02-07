# Arbitrary CPI

An Arbitrary Cross Program Invocation (CPI) vulnerability occurs when programs call external programs without validating which program they're invoking. This transforms a secure program into a proxy for malicious code execution.

## Severity: Critical

Attackers can substitute malicious programs that perform unauthorized operations with your program's authority.

## The Vulnerability

### Core Issue

Solana's flexible account model allows any program ID to be passed as an account. Without explicit validation, attackers can:
1. Create malicious programs mimicking legitimate interfaces
2. Pass their program as the "token_program" or similar parameter
3. Have your program invoke their malicious code
4. Execute unauthorized operations with your program's PDA authority

### Vulnerable Pattern (Anchor)

```rust
#[derive(Accounts)]
pub struct SendTokens<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    // VULNERABLE: No validation of program ID
    pub token_program: UncheckedAccount<'info>,
}

pub fn send_tokens(ctx: Context<SendTokens>, amount: u64) -> Result<()> {
    // VULNERABLE: Invoking unvalidated program
    let cpi_accounts = Transfer {
        from: ctx.accounts.source.to_account_info(),
        to: ctx.accounts.destination.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),  // Could be malicious!
        cpi_accounts,
    );

    transfer(cpi_ctx, amount)?;
    Ok(())
}
```

### Vulnerable Pattern (Pinocchio)

```rust
pub fn process_send_tokens(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let authority = &accounts[0];
    let source = &accounts[1];
    let destination = &accounts[2];
    let token_program = &accounts[3];  // VULNERABLE: Unvalidated

    // Invoking whatever program was passed
    invoke(
        &spl_token::instruction::transfer(
            token_program.key(),  // Could be malicious!
            source.key(),
            destination.key(),
            authority.key(),
            &[],
            amount,
        )?,
        &[source.clone(), destination.clone(), authority.clone()],
    )?;

    Ok(())
}
```

## Exploit Scenario

### Malicious Token Program

```rust
// Attacker's fake "token program"
pub fn process_instruction(
    _program_id: &Pubkey,
    accounts: &[AccountInfo],
    instruction_data: &[u8],
) -> ProgramResult {
    // Instead of transferring FROM source TO destination...
    // Transfer FROM destination TO attacker!

    let source = &accounts[0];      // Victim expects: their account
    let destination = &accounts[1]; // Victim expects: recipient
    let authority = &accounts[2];   // Victim's authority

    // Reverse the transfer direction
    // Or drain everything to attacker
    // Or do nothing and claim success

    Ok(())
}
```

### Attack Flow

```
1. Attacker deploys malicious program with same interface as Token Program
2. Attacker calls vulnerable program with:
   - token_program = attacker's malicious program
   - source = victim's token account
   - destination = attacker's account
3. Vulnerable program invokes attacker's program
4. Attacker's program drains victim's tokens
```

## Secure Implementations

### Anchor: Using Program Type (Recommended)

```rust
#[derive(Accounts)]
pub struct SendTokens<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub source: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination: Account<'info, TokenAccount>,
    // SECURE: Program<T> validates program ID automatically
    pub token_program: Program<'info, Token>,
}
```

### Anchor: For Token-2022 Compatibility

```rust
#[derive(Accounts)]
pub struct SendTokens<'info> {
    // SECURE: Interface type accepts both Token and Token-2022
    pub token_program: Interface<'info, TokenInterface>,
}
```

### Anchor: Manual Validation

```rust
pub fn send_tokens(ctx: Context<SendTokens>, amount: u64) -> Result<()> {
    // SECURE: Explicit program ID check
    let token_program_id = ctx.accounts.token_program.key();

    if token_program_id != &spl_token::ID &&
       token_program_id != &spl_token_2022::ID {
        return Err(ErrorCode::InvalidTokenProgram.into());
    }

    // Now safe to invoke
    // ...
}
```

### Pinocchio: Explicit Validation

```rust
pub fn process_send_tokens(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let authority = &accounts[0];
    let source = &accounts[1];
    let destination = &accounts[2];
    let token_program = &accounts[3];

    // SECURE: Validate program ID before invocation
    if !token_program.key().eq(&spl_token::ID) &&
       !token_program.key().eq(&spl_token_2022::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    // Now safe to invoke
    invoke(
        &spl_token::instruction::transfer(
            token_program.key(),
            source.key(),
            destination.key(),
            authority.key(),
            &[],
            amount,
        )?,
        &[source.clone(), destination.clone(), authority.clone(), token_program.clone()],
    )?;

    Ok(())
}
```

### Pinocchio: Using pinocchio-token

```rust
use pinocchio_token::instructions::Transfer;

pub fn process_send_tokens(accounts: &[AccountInfo], amount: u64) -> ProgramResult {
    let ctx = SendTokensAccounts::try_from(accounts)?;

    // SECURE: Validate before CPI
    if !ctx.token_program.key().eq(&pinocchio_token::ID) {
        return Err(ProgramError::IncorrectProgramId);
    }

    Transfer {
        from: ctx.source,
        to: ctx.destination,
        authority: ctx.authority,
        amount,
    }
    .invoke()
}
```

### Pinocchio: TryFrom with Validation

```rust
impl<'a> TryFrom<&'a [AccountInfo]> for SendTokensAccounts<'a> {
    type Error = ProgramError;

    fn try_from(accounts: &'a [AccountInfo]) -> Result<Self, Self::Error> {
        let [authority, source, destination, token_program, ..] = accounts else {
            return Err(ProgramError::NotEnoughAccountKeys);
        };

        // SECURE: Validate program ID during account parsing
        if !token_program.key().eq(&spl_token::ID) &&
           !token_program.key().eq(&spl_token_2022::ID) {
            return Err(ProgramError::IncorrectProgramId);
        }

        Ok(Self { authority, source, destination, token_program })
    }
}
```

## Common Programs to Validate

| Program | ID Constant |
|---------|-------------|
| SPL Token | `spl_token::ID` |
| Token-2022 | `spl_token_2022::ID` |
| System Program | `system_program::ID` |
| Associated Token | `spl_associated_token_account::ID` |
| Memo Program | `spl_memo::ID` |

## Detection Checklist

When auditing, look for:

- [ ] `UncheckedAccount` used for program accounts
- [ ] CPI calls without program ID validation
- [ ] Missing `Program<'info, T>` or `Interface<'info, T>` types
- [ ] `invoke()` or `invoke_signed()` with unvalidated program
- [ ] Dynamic program selection without whitelist

## Testing for the Vulnerability

```rust
#[test]
fn test_arbitrary_cpi() {
    // Deploy a malicious "token program"
    let malicious_program = deploy_malicious_token_program();

    // Try to use it in place of real token program
    let result = send_tokens(
        authority,
        source,
        destination,
        malicious_program,  // Not the real token program!
        1000,
    );

    // Should fail if protection exists
    assert!(result.is_err(), "Should reject unknown program!");
    assert_eq!(
        result.unwrap_err(),
        ProgramError::IncorrectProgramId
    );
}
```

## Related Vulnerabilities

### Arbitrary CPI + PDA Signing

Extra dangerous when your program signs with PDAs:

```rust
// If attacker controls the invoked program AND
// your program signs with a PDA...
invoke_signed(
    &attacker_instruction,  // Attacker's code
    &accounts,
    &[&[b"authority", &[bump]]],  // Your PDA signature!
)?;
// Attacker now has your PDA's signing authority!
```

**Defense:** Always validate program before `invoke_signed`.

## Key Takeaways

1. **Always use `Program<'info, T>`** in Anchor for CPI targets
2. **Always validate program ID** in Pinocchio before invoke
3. **UncheckedAccount for programs = vulnerability**
4. **CPI transfers trust** - invoked program runs with your context
5. **PDA signing amplifies risk** - attacker gets your authority
6. **Whitelist known programs** - don't accept arbitrary program IDs
