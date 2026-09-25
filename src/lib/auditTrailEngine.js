'use strict';
/**
 * src/lib/auditTrailEngine.js
 * SYM EMPIRE PLATFORM (S.E.P.) — Cryptographic Immutable Audit Trail Engine
 *
 * Implements a blockchain-style, tamper-evident audit ledger using SHA-256
 * block hashing to guarantee non-repudiation of all administrative actions.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = path.join(__dirname, '../../data/audit_trail.json');

let auditStore = {
  chain_head: '0000000000000000000000000000000000000000000000000000000000000000',
  blocks: []
};

function computeBlockHash(blockData) {
  const payload = [
    blockData.index,
    blockData.timestamp,
    blockData.previous_hash,
    blockData.staff_id || 'UNKNOWN',
    blockData.staff_role || 'STAFF',
    blockData.action || 'ACTION',
    blockData.entity_type || 'NONE',
    blockData.entity_id || 'NONE',
    JSON.stringify(blockData.details || {}),
    blockData.ip_address || '127.0.0.1',
    blockData.user_agent || 'Unknown'
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8').replace(/^\uFEFF/, '');
      auditStore = JSON.parse(raw);
      if (!Array.isArray(auditStore.blocks)) auditStore.blocks = [];
      if (auditStore.blocks.length > 0) {
        auditStore.chain_head = auditStore.blocks[auditStore.blocks.length - 1].hash;
      }
    } else {
      initializeGenesis();
    }
  } catch (err) {
    console.error('[AuditTrailEngine] Error loading audit_trail.json:', err.message);
    initializeGenesis();
  }
}

function initializeGenesis() {
  const genesis = {
    index: 0,
    block_index: 0,
    timestamp: '2026-09-18T10:00:00.000Z',
    previous_hash: '0000000000000000000000000000000000000000000000000000000000000000',
    staff_id: 'SYSTEM_GENESIS',
    staff_name: 'SYM EMPIRE Master Protocol',
    staff_role: 'SUPER_ADMIN',
    action: 'SYSTEM_INITIALIZED',
    entity_type: 'SYSTEM',
    entity_id: 'SEP-CORE-GENESIS',
    details: {
      message: 'Immutable cryptographic audit trail initialized under SHA-256 block hashing standards.'
    },
    ip_address: '127.0.0.1',
    user_agent: 'SEP Core Engine'
  };

  genesis.hash = computeBlockHash(genesis);
  genesis.block_hash = genesis.hash;
  auditStore = {
    chain_head: genesis.hash,
    blocks: [genesis]
  };
  saveStore();
}

function saveStore() {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(auditStore, null, 2), 'utf8');
        break;
      } catch (err) {
        if (attempt === 4) throw err;
        const start = Date.now();
        while (Date.now() - start < 40 * (attempt + 1)) {}
      }
    }
  } catch (err) {
    console.error('[AuditTrailEngine] Error saving audit_trail.json:', err.message);
  }
}

loadStore();

const auditTrailEngine = {
  /**
   * Append an immutable audit block to the ledger
   */
  recordAction(params) {
    loadStore();
    const {
      staff_id = 'SYSTEM',
      staff_name = 'Administrative Operator',
      staff_role = 'SUPER_ADMIN',
      action,
      entity_type = 'GENERAL',
      entity_id = null,
      details = {},
      ip_address = '127.0.0.1',
      user_agent = 'Unknown'
    } = params;

    if (!action) {
      throw new Error('Audit action identifier is required.');
    }

    const previousBlock = auditStore.blocks.length > 0
      ? auditStore.blocks[auditStore.blocks.length - 1]
      : null;

    const previousHash = previousBlock ? previousBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
    const nextIndex = auditStore.blocks.length;

    const blockData = {
      index: nextIndex,
      block_index: nextIndex,
      timestamp: new Date().toISOString(),
      previous_hash: previousHash,
      staff_id,
      staff_name,
      staff_role,
      action,
      entity_type,
      entity_id: String(entity_id || 'N/A'),
      details,
      ip_address,
      user_agent
    };

    blockData.hash = computeBlockHash(blockData);
    blockData.block_hash = blockData.hash;

    auditStore.blocks.push(blockData);
    auditStore.chain_head = blockData.hash;
    saveStore();

    console.log(`[AuditTrail] 🔒 Block #${blockData.index} [${blockData.action}] recorded by ${staff_name} (${staff_role}) -> Hash: ${blockData.hash.slice(0, 16)}...`);

    return blockData;
  },

  /**
   * Helper to extract staff context from Express request and record action
   */
  recordExpressAction(req, action, entityType, entityId, details = {}) {
    const staff = req.staffUser || {
      id: req.headers['x-admin-key'] ? 'stf_superadmin_01' : 'UNKNOWN',
      display_name: req.headers['x-admin-key'] ? 'Executive Director (Admin Key)' : 'Anonymous Staff',
      role: 'SUPER_ADMIN'
    };

    const forwarded = req.headers['x-forwarded-for'];
    const ip_address = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || '127.0.0.1');
    const user_agent = req.headers['user-agent'] || 'Unknown';

    return this.recordAction({
      staff_id: staff.id,
      staff_name: staff.display_name,
      staff_role: staff.role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      ip_address,
      user_agent
    });
  },

  /**
   * Cryptographic integrity verification of the entire hash chain
   */
  verifyChainIntegrity() {
    loadStore();
    const blocks = auditStore.blocks;

    if (!Array.isArray(blocks) || blocks.length === 0) {
      return {
        valid: false,
        total_blocks: 0,
        error: 'Empty audit chain.',
        tampered_block_index: null
      };
    }

    // Verify Genesis block (Index 0)
    const genesis = blocks[0];
    if (genesis.index !== 0 || genesis.previous_hash !== '0000000000000000000000000000000000000000000000000000000000000000') {
      return {
        valid: false,
        total_blocks: blocks.length,
        error: 'Genesis block linkage is corrupt.',
        tampered_block_index: 0
      };
    }

    const computedGenesisHash = computeBlockHash(genesis);
    if (computedGenesisHash !== genesis.hash) {
      return {
        valid: false,
        total_blocks: blocks.length,
        error: 'Genesis block hash verification failed.',
        tampered_block_index: 0
      };
    }

    // Verify all subsequent blocks
    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];

      if (curr.index !== i) {
        return {
          valid: false,
          total_blocks: blocks.length,
          error: `Block index sequence mismatch at index ${i}. Expected ${i}, found ${curr.index}.`,
          tampered_block_index: i
        };
      }

      if (curr.previous_hash !== prev.hash) {
        return {
          valid: false,
          total_blocks: blocks.length,
          error: `Cryptographic linkage broken at block #${i}. previous_hash does not match parent block hash.`,
          tampered_block_index: i
        };
      }

      const recomputedHash = computeBlockHash(curr);
      if (recomputedHash !== curr.hash) {
        return {
          valid: false,
          total_blocks: blocks.length,
          error: `Data tampering detected at block #${i}. Recomputed hash diverges from recorded hash.`,
          tampered_block_index: i
        };
      }
    }

    return {
      valid: true,
      total_blocks: blocks.length,
      head_hash: auditStore.chain_head,
      verified_at: new Date().toISOString(),
      tampered_block_index: null
    };
  },

  /**
   * Query audit logs with multi-dimensional filtering
   */
  getAuditLogs(query = {}) {
    loadStore();
    let logs = [...auditStore.blocks].reverse(); // Newest first

    if (query.staff_id) {
      logs = logs.filter(l => l.staff_id === query.staff_id);
    }
    if (query.staff_role) {
      logs = logs.filter(l => l.staff_role === query.staff_role);
    }
    if (query.action) {
      logs = logs.filter(l => l.action === query.action);
    }
    if (query.entity_type) {
      logs = logs.filter(l => l.entity_type === query.entity_type);
    }
    if (query.entity_id) {
      logs = logs.filter(l => l.entity_id === query.entity_id);
    }
    if (query.search) {
      const s = query.search.toLowerCase();
      logs = logs.filter(l =>
        (l.staff_name && l.staff_name.toLowerCase().includes(s)) ||
        (l.action && l.action.toLowerCase().includes(s)) ||
        (l.entity_id && l.entity_id.toLowerCase().includes(s)) ||
        (l.hash && l.hash.toLowerCase().includes(s)) ||
        (l.details && JSON.stringify(l.details).toLowerCase().includes(s))
      );
    }

    const total = logs.length;
    const limit = Math.min(200, parseInt(query.limit, 10) || 50);
    const offset = Math.max(0, parseInt(query.offset, 10) || 0);
    const paginatedLogs = logs.slice(offset, offset + limit);

    const formattedLogs = paginatedLogs.map(b => ({
      ...b,
      block_index: b.block_index !== undefined ? b.block_index : b.index,
      block_hash: b.block_hash || b.hash
    }));

    // Compute aggregate statistics
    const stats = {
      total_blocks: auditStore.blocks.length,
      total_recorded_actions: auditStore.blocks.length,
      filtered_count: total,
      unique_operators: new Set(auditStore.blocks.map(b => b.staff_id)).size,
      head_hash: auditStore.chain_head,
      actions_distribution: {}
    };

    auditStore.blocks.forEach(b => {
      stats.actions_distribution[b.action] = (stats.actions_distribution[b.action] || 0) + 1;
    });

    return {
      success: true,
      total,
      limit,
      offset,
      logs: formattedLogs,
      stats,
      chain_head: auditStore.chain_head,
      is_integrity_valid: this.verifyChainIntegrity().valid
    };
  },

  computeBlockHash
};

module.exports = auditTrailEngine;
