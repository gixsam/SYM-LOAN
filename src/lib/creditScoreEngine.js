'use strict';
/**
 * src/lib/creditScoreEngine.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Dynamic Credit Scoring & VIP Loyalty Tier Engine
 *
 * Capabilities:
 *   1. Multidimensional FICO-style credit score calculation (300 - 850 range)
 *   2. Letter grading system (A+, A, B, C, D, F) with dynamic risk indicators
 *   3. 5-Tier VIP Loyalty ladder (Bronze, Silver, Gold, Platinum, Diamond)
 *   4. Dynamic credit limit & service fee discount calculations
 *   5. Administrative manual score offsets, tier locks, and audit tracking
 *   6. Portfolio credit distribution analytics
 */

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./supabase');
const kycManager = require('./kycManager');
const repaymentManager = require('./repaymentManager');

const DATA_FILE = path.join(__dirname, '../../data/credit_scores.json');

let creditStore = {
  overrides: {},
  audit_log: []
};

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
      creditStore = JSON.parse(raw);
      if (!creditStore.overrides) creditStore.overrides = {};
      if (!creditStore.audit_log) creditStore.audit_log = [];
    }
  } catch (err) {
    console.error('[CreditScoreEngine] Error loading credit_scores.json:', err.message);
    creditStore = { overrides: {}, audit_log: [] };
  }
}

function saveStore() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(creditStore, null, 2), 'utf8');
  } catch (err) {
    console.error('[CreditScoreEngine] Error saving credit_scores.json:', err.message);
  }
}

loadStore();

// VIP Tier Definitions
const VIP_TIERS = {
  BRONZE: {
    id: 'BRONZE',
    name: 'Bronze Member',
    badge: '🥉',
    color: '#cd7f32',
    min_settled_loans: 0,
    max_settled_loans: 0,
    max_limit: 10000,
    fee_discount_percent: 0,
    base_fee_percent: 10,
    effective_fee_percent: 10,
    perks: ['Standard Processing', 'Basic Support'],
    next_tier: 'SILVER',
    next_tier_req: 1
  },
  SILVER: {
    id: 'SILVER',
    name: 'Silver Member',
    badge: '🥈',
    color: '#a8a29e',
    min_settled_loans: 1,
    max_settled_loans: 2,
    max_limit: 25000,
    fee_discount_percent: 1,
    base_fee_percent: 10,
    effective_fee_percent: 9,
    perks: ['1% Service Fee Discount', 'Express Loan Verification'],
    next_tier: 'GOLD',
    next_tier_req: 3
  },
  GOLD: {
    id: 'GOLD',
    name: 'Gold Member',
    badge: '🥇',
    color: '#eab308',
    min_settled_loans: 3,
    max_settled_loans: 5,
    max_limit: 50000,
    fee_discount_percent: 2,
    base_fee_percent: 10,
    effective_fee_percent: 8,
    perks: ['2% Service Fee Discount', 'Priority Queue', 'Flexible Rescheduling'],
    next_tier: 'PLATINUM',
    next_tier_req: 6
  },
  PLATINUM: {
    id: 'PLATINUM',
    name: 'Platinum Member',
    badge: '💎',
    color: '#06b6d4',
    min_settled_loans: 6,
    max_settled_loans: 9,
    max_limit: 75000,
    fee_discount_percent: 3,
    base_fee_percent: 10,
    effective_fee_percent: 7,
    perks: ['3% Service Fee Discount', '24-Hour Grace Period', 'Dedicated Loan Manager'],
    next_tier: 'DIAMOND',
    next_tier_req: 10
  },
  DIAMOND: {
    id: 'DIAMOND',
    name: 'Diamond VIP',
    badge: '👑',
    color: '#a855f7',
    min_settled_loans: 10,
    max_settled_loans: 999999,
    max_limit: 100000,
    fee_discount_percent: 5,
    base_fee_percent: 10,
    effective_fee_percent: 5,
    perks: ['5% Service Fee Discount', 'Instant Auto-Disbursement', 'Zero Collateral Required', 'Executive Concierge'],
    next_tier: null,
    next_tier_req: null
  }
};

// Letter Grade Mappings
function getGradeFromScore(score) {
  if (score >= 780) {
    return {
      grade: 'A+',
      title: 'Elite Borrower',
      description: 'Exceptional credit history, zero risk, highest limits available.',
      color: '#10b981', // emerald
      risk_level: 'VERY_LOW',
      grade_ceiling: 100000
    };
  }
  if (score >= 700) {
    return {
      grade: 'A',
      title: 'Prime Borrower',
      description: 'Solid repayment track record, low credit risk.',
      color: '#3b82f6', // blue
      risk_level: 'LOW',
      grade_ceiling: 50000
    };
  }
  if (score >= 620) {
    return {
      grade: 'B',
      title: 'Standard Borrower',
      description: 'Reliable borrower with acceptable credit metrics.',
      color: '#06b6d4', // cyan
      risk_level: 'MODERATE',
      grade_ceiling: 25000
    };
  }
  if (score >= 540) {
    return {
      grade: 'C',
      title: 'Fair Risk',
      description: 'Moderate risk profile; requires strict due date enforcement.',
      color: '#f59e0b', // amber
      risk_level: 'ELEVATED',
      grade_ceiling: 10000
    };
  }
  if (score >= 450) {
    return {
      grade: 'D',
      title: 'High Risk',
      description: 'Subprime borrower with prior delays or low telemetry.',
      color: '#f97316', // orange
      risk_level: 'HIGH',
      grade_ceiling: 5000
    };
  }
  return {
    grade: 'F',
    title: 'Default / Ineligible',
    description: 'Severely delinquent or excessive strikes. Ineligible for new borrowing.',
    color: '#ef4444', // red
    risk_level: 'CRITICAL',
    grade_ceiling: 0
  };
}

const creditScoreEngine = {
  /**
   * Pure calculation function given client telemetry context
   */
  computeCreditTelemetry(context) {
    const {
      status = 'ACTIVE',
      strikes_count = 0,
      verified_repayments_count = 0,
      total_repaid_amount = 0,
      active_overdue_loans_count = 0,
      active_loans_count = 0,
      is_kyc_verified = false,
      is_email_verified = false,
      has_telegram_chat = false,
      account_age_days = 0,
      override = null
    } = context;

    // 1. Base Score
    let rawScore = 550;

    // 2. Repayment Performance (Weight: ~35%)
    // Each verified repayment adds +35 points (up to +175)
    const repaymentCountBonus = Math.min(175, verified_repayments_count * 35);
    // Repaid volume bonus: +10 points per ৳5,000 (up to +100)
    const volumeBonus = Math.min(100, Math.floor((total_repaid_amount || 0) / 5000) * 10);
    rawScore += repaymentCountBonus;
    rawScore += volumeBonus;

    // 3. Delinquency & Strike Penalties
    const strikePenalty = strikes_count * 75;
    const overduePenalty = active_overdue_loans_count * 60;
    rawScore -= strikePenalty;
    rawScore -= overduePenalty;

    // 4. KYC & Trust Anchors (Weight: ~15%)
    if (is_kyc_verified) rawScore += 50;
    if (is_email_verified) rawScore += 20;
    if (has_telegram_chat) rawScore += 20;

    // 5. Account Longevity
    if (account_age_days >= 90) rawScore += 30;
    else if (account_age_days >= 30) rawScore += 15;

    // 6. Zero active debt bonus
    if (active_loans_count === 0 && verified_repayments_count > 0) {
      rawScore += 25;
    }

    // 7. Manual Administrative Offset
    if (override && typeof override.score_offset === 'number') {
      rawScore += override.score_offset;
    }

    // 8. Clamp strictly between 300 and 850
    let finalScore = Math.max(300, Math.min(850, Math.round(rawScore)));

    // 9. Blacklist or Strike lockout threshold
    const isBlocked = status === 'BLOCKED' || (override && override.force_status === 'BLOCKED');
    if (isBlocked || strikes_count >= 3) {
      finalScore = Math.min(finalScore, 380);
    }

    // Determine Grade
    let gradeInfo = getGradeFromScore(finalScore);
    if (override && override.fixed_grade) {
      const customGrade = getGradeFromScore(
        override.fixed_grade === 'A+' ? 800 :
        override.fixed_grade === 'A'  ? 720 :
        override.fixed_grade === 'B'  ? 650 :
        override.fixed_grade === 'C'  ? 580 :
        override.fixed_grade === 'D'  ? 480 : 350
      );
      gradeInfo = { ...customGrade, grade: override.fixed_grade };
    }

    // Determine VIP Tier
    let vipTier = VIP_TIERS.BRONZE;
    if (verified_repayments_count >= 10) vipTier = VIP_TIERS.DIAMOND;
    else if (verified_repayments_count >= 6) vipTier = VIP_TIERS.PLATINUM;
    else if (verified_repayments_count >= 3) vipTier = VIP_TIERS.GOLD;
    else if (verified_repayments_count >= 1) vipTier = VIP_TIERS.SILVER;

    if (override && override.fixed_tier && VIP_TIERS[override.fixed_tier]) {
      vipTier = VIP_TIERS[override.fixed_tier];
    }

    // Calculate Eligible Credit Limit:
    // Limit is bounded by both VIP tier ceiling and Grade ceiling
    let eligibleLimit = Math.min(vipTier.max_limit, gradeInfo.grade_ceiling);
    if (isBlocked || strikes_count >= 3) {
      eligibleLimit = 0;
    }

    // Calculate VIP Progress to Next Tier
    let nextTierProgress = 100;
    let loansNeededForNextTier = 0;
    if (vipTier.next_tier && VIP_TIERS[vipTier.next_tier]) {
      const targetReq = VIP_TIERS[vipTier.next_tier].min_settled_loans;
      const currentMin = vipTier.min_settled_loans;
      loansNeededForNextTier = Math.max(0, targetReq - verified_repayments_count);
      const span = targetReq - currentMin;
      const completed = verified_repayments_count - currentMin;
      nextTierProgress = Math.min(100, Math.max(0, Math.round((completed / span) * 100)));
    }

    return {
      score: finalScore,
      grade: gradeInfo.grade,
      title: gradeInfo.title,
      description: gradeInfo.description,
      color: gradeInfo.color,
      risk_level: gradeInfo.risk_level,
      vip_tier: vipTier,
      eligible_credit_limit: eligibleLimit,
      effective_service_fee_percent: vipTier.effective_fee_percent,
      next_tier_progress: nextTierProgress,
      loans_needed_for_next_tier: loansNeededForNextTier,
      telemetry: {
        verified_repayments_count,
        total_repaid_amount,
        strikes_count,
        active_overdue_loans_count,
        active_loans_count,
        is_kyc_verified,
        is_email_verified,
        has_telegram_chat,
        account_age_days,
        has_admin_override: Boolean(override)
      }
    };
  },

  /**
   * Resolve full dynamic credit profile for a client by ID
   */
  async getClientCreditProfile(clientId) {
    loadStore();
    if (!clientId) throw new Error('clientId is required.');

    // 1. Fetch Client Profile from Supabase
    const { data: client, error: clientErr } = await supabaseAdmin
      .from('client_profiles')
      .select('*')
      .eq('id', clientId)
      .maybeSingle();

    if (clientErr || !client) {
      return null;
    }

    // 2. Fetch KYC info
    const isKycVerified = kycManager.isClientKycVerified(clientId);
    const kycProfile = kycManager.getProfile(clientId);

    // 3. Fetch Repayment History from repaymentManager
    const verifiedRepayments = repaymentManager.getRepayments({
      client_id: clientId,
      status: 'VERIFIED'
    });
    const verifiedRepaymentsCount = verifiedRepayments.length;
    const totalRepaidAmount = verifiedRepayments.reduce((sum, r) => sum + (r.amount_paid || 0), 0);

    // 4. Fetch Client Loans from Supabase
    let activeLoansCount = 0;
    let activeOverdueLoansCount = 0;
    try {
      const { data: loans } = await supabaseAdmin
        .from('money_requests')
        .select('id, amount, status, deadline_date')
        .eq('client_id', clientId);

      if (loans && loans.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        loans.forEach(loan => {
          if (loan.status === 'ACCEPTED' || loan.status === 'PENDING') {
            activeLoansCount++;
            if (loan.status === 'ACCEPTED' && loan.deadline_date && loan.deadline_date < todayStr) {
              activeOverdueLoansCount++;
            }
          }
        });
      }
    } catch (loanErr) {
      console.warn('[CreditScoreEngine] Error querying client loans:', loanErr.message);
    }

    // 5. Calculate Account Age
    let accountAgeDays = 0;
    if (client.created_at) {
      const createdDate = new Date(client.created_at);
      accountAgeDays = Math.max(0, Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // 6. Look up Admin Override
    const override = creditStore.overrides[clientId] || null;

    // 7. Compute
    const profile = this.computeCreditTelemetry({
      status: client.status,
      strikes_count: client.strikes_count || 0,
      verified_repayments_count: verifiedRepaymentsCount,
      total_repaid_amount: totalRepaidAmount,
      active_overdue_loans_count: activeOverdueLoansCount,
      active_loans_count: activeLoansCount,
      is_kyc_verified: isKycVerified,
      is_email_verified: Boolean(client.email && kycProfile?.email_verified),
      has_telegram_chat: Boolean(client.telegram_chat_id),
      account_age_days: accountAgeDays,
      override
    });

    return {
      client_id: client.id,
      client_name: client.name,
      client_phone: client.phone_number,
      client_status: client.status,
      ...profile
    };
  },

  /**
   * Set admin override for a specific client
   */
  setAdminOverride(clientId, options = {}) {
    loadStore();
    if (!clientId) throw new Error('clientId is required.');

    const scoreOffset = options.score_offset !== undefined ? options.score_offset : (options.score_delta !== undefined ? options.score_delta : 0);
    const fixedGrade = options.fixed_grade || null;
    const fixedTier = options.fixed_tier || null;
    const forceStatus = options.force_status || null;
    const adminNote = options.admin_note || options.reason || 'Administrative credit override';
    const adminUser = options.admin_user || 'Admin';

    creditStore.overrides[clientId] = {
      client_id: clientId,
      score_offset: parseInt(scoreOffset, 10) || 0,
      fixed_grade: fixedGrade,
      fixed_tier: fixedTier,
      force_status: forceStatus,
      admin_note: adminNote,
      admin_user: adminUser,
      updated_at: new Date().toISOString()
    };

    creditStore.audit_log.unshift({
      client_id: clientId,
      action: 'SET_OVERRIDE',
      details: creditStore.overrides[clientId],
      timestamp: new Date().toISOString()
    });

    saveStore();
    return creditStore.overrides[clientId];
  },

  /**
   * Remove admin override
   */
  removeAdminOverride(clientId) {
    loadStore();
    if (creditStore.overrides[clientId]) {
      delete creditStore.overrides[clientId];
      creditStore.audit_log.unshift({
        client_id: clientId,
        action: 'REMOVE_OVERRIDE',
        timestamp: new Date().toISOString()
      });
      saveStore();
      return true;
    }
    return false;
  },

  /**
   * Get entire portfolio credit intelligence matrix
   */
  async getPortfolioCreditMatrix() {
    loadStore();

    const { data: clients, error } = await supabaseAdmin
      .from('client_profiles')
      .select('id, name, phone_number, status, strikes_count, created_at')
      .order('created_at', { ascending: false });

    if (error || !clients) {
      return {
        summary: {
          total_borrowers: 0,
          average_score: 550,
          prime_count: 0,
          high_risk_count: 0,
          vip_count: 0
        },
        items: []
      };
    }

    const items = [];
    let totalScore = 0;
    let primeCount = 0;
    let highRiskCount = 0;
    let vipCount = 0;

    for (const client of clients) {
      try {
        const profile = await this.getClientCreditProfile(client.id);
        if (profile) {
          totalScore += profile.score;
          if (profile.score >= 700) primeCount++;
          if (profile.score < 540) highRiskCount++;
          if (profile.vip_tier.id !== 'BRONZE') vipCount++;
          items.push(profile);
        }
      } catch (e) {
        console.warn(`[CreditScoreEngine] Error profiling client ${client.id}:`, e.message);
      }
    }

    const avgScore = items.length > 0 ? Math.round(totalScore / items.length) : 550;

    return {
      summary: {
        total_borrowers: items.length,
        average_score: avgScore,
        prime_count: primeCount,
        prime_percentage: items.length > 0 ? Math.round((primeCount / items.length) * 100) : 0,
        high_risk_count: highRiskCount,
        vip_count: vipCount
      },
      items
    };
  }
};

creditScoreEngine.VIP_TIERS = VIP_TIERS;
creditScoreEngine.getGradeFromScore = getGradeFromScore;

module.exports = creditScoreEngine;
