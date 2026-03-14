-- =============================================================
-- Billiard POS v2 — SQL Sample Data
-- =============================================================
-- ⚠️  PENTING: Password di SQL ini TIDAK bisa langsung dipakai
--    karena bcrypt hash harus di-generate ulang.
--
-- CARA YANG DIREKOMENDASIKAN:
--   1. cd apps/api
--   2. npm install
--   3. npx prisma migrate dev
--   4. node seed.js          ← jalankan ini!
--
-- Seed script (seed.js) otomatis membuat semua data di bawah
-- dengan password yang benar.
-- =============================================================

-- Jika tetap ingin pakai SQL manual, gunakan hash berikut
-- (di-generate dengan bcrypt cost factor 12):
--
-- Password "owner123"   -> hash di bawah
-- Password "manager123" -> hash di bawah
-- Password "kasir123"   -> hash di bawah
-- Password "dev123"     -> hash di bawah
-- PIN "123456"          -> hash di bawah

-- Cara generate hash di Node.js:
--   node -e "const b=require('bcryptjs'); b.hash('owner123',12).then(console.log)"

-- =============================================================
-- COMPANY PROFILE
-- =============================================================
INSERT INTO company_profiles (id, name, address, phoneNumber, createdAt, updatedAt)
VALUES (
  'company-001',
  'Billiard Center',
  'Jl. Contoh No. 1, Kota Anda',
  '081234567890',
  NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================================
-- MENU CATEGORIES
-- =============================================================
INSERT INTO menu_categories (id, name, skuPrefix, lastSkuNumber, createdAt, updatedAt) VALUES
  ('cat-mnm', 'Minuman', 'MNM', 0, NOW(), NOW()),
  ('cat-mkn', 'Makanan', 'MKN', 0, NOW(), NOW()),
  ('cat-snk', 'Snack',   'SNK', 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================================
-- MEJA BILLIARD (tanpa IoT)
-- =============================================================
INSERT INTO tables (id, name, hourlyRate, status, isActive, createdAt, updatedAt) VALUES
  ('table-01', 'Meja 1', 25000.00, 'AVAILABLE', TRUE, NOW(), NOW()),
  ('table-02', 'Meja 2', 25000.00, 'AVAILABLE', TRUE, NOW(), NOW()),
  ('table-03', 'Meja 3', 25000.00, 'AVAILABLE', TRUE, NOW(), NOW()),
  ('table-04', 'Meja 4', 30000.00, 'AVAILABLE', TRUE, NOW(), NOW()),
  ('table-05', 'Meja 5', 30000.00, 'AVAILABLE', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================================
-- AKUN PENGGUNA
-- ⚠️  Ganti [HASH_XXX] dengan hash asli dari node seed.js
--    JANGAN jalankan SQL ini langsung tanpa mengganti hash!
-- =============================================================

-- OWNER  |  owner@billiard.com  |  password: owner123  |  PIN: 123456
-- (Jalankan: node -e "require('bcryptjs').hash('owner123',12).then(h=>console.log('pw:',h))")
-- (Jalankan: node -e "require('bcryptjs').hash('123456',12).then(h=>console.log('pin:',h))")
INSERT INTO users (id, name, email, phoneNumber, passwordHash, pin, role, isActive, createdAt, updatedAt)
VALUES (
  'user-owner-001',
  'Budi Santoso',
  'owner@billiard.com',
  '081234567890',
  '[HASH_OWNER123]',    -- ganti dengan hash bcrypt 'owner123'
  '[HASH_PIN_123456]',  -- ganti dengan hash bcrypt '123456'
  'OWNER',
  TRUE, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- MANAGER  |  manager@billiard.com  |  password: manager123
INSERT INTO users (id, name, email, phoneNumber, passwordHash, role, isActive, createdAt, updatedAt)
VALUES (
  'user-mgr-001',
  'Sari Dewi',
  'manager@billiard.com',
  '081234567891',
  '[HASH_MANAGER123]',  -- ganti dengan hash bcrypt 'manager123'
  'MANAGER',
  TRUE, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- CASHIER 1  |  kasir1@billiard.com  |  password: kasir123
INSERT INTO users (id, name, email, phoneNumber, passwordHash, role, isActive, createdAt, updatedAt)
VALUES (
  'user-kasir-001',
  'Andi Pratama',
  'kasir1@billiard.com',
  '081234567892',
  '[HASH_KASIR123]',    -- ganti dengan hash bcrypt 'kasir123'
  'CASHIER',
  TRUE, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- CASHIER 2  |  kasir2@billiard.com  |  password: kasir123
INSERT INTO users (id, name, email, phoneNumber, passwordHash, role, isActive, createdAt, updatedAt)
VALUES (
  'user-kasir-002',
  'Lina Agustina',
  'kasir2@billiard.com',
  '081234567893',
  '[HASH_KASIR123]',    -- sama seperti kasir1
  'CASHIER',
  TRUE, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- DEVELOPER  |  dev@billiard.com  |  password: dev123
INSERT INTO users (id, name, email, phoneNumber, passwordHash, role, isActive, createdAt, updatedAt)
VALUES (
  'user-dev-001',
  'Rizky Developer',
  'dev@billiard.com',
  '081234567894',
  '[HASH_DEV123]',      -- ganti dengan hash bcrypt 'dev123'
  'DEVELOPER',
  TRUE, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- MEMBER 1  |  member-m0001@internal.vluxe.local  |  password: MBR00001
INSERT INTO users (id, name, email, phoneNumber, passwordHash, memberNumber, role, isActive, createdAt, updatedAt)
VALUES (
  'user-mbr-001',
  'Ahmad Fauzi',
  'member-m0001@internal.vluxe.local',
  '08111111001',
  '[HASH_MBR00001]',    -- ganti dengan hash bcrypt 'MBR00001'
  'M-0001',
  'MEMBER',
  TRUE, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- MEMBER 2  |  member-m0002@internal.vluxe.local  |  password: MBR00002
INSERT INTO users (id, name, email, phoneNumber, passwordHash, memberNumber, role, isActive, createdAt, updatedAt)
VALUES (
  'user-mbr-002',
  'Dewi Rahayu',
  'member-m0002@internal.vluxe.local',
  '08111111002',
  '[HASH_MBR00002]',    -- ganti dengan hash bcrypt 'MBR00002'
  'M-0002',
  'MEMBER',
  TRUE, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- MEMBER 3  |  member-m0003@internal.vluxe.local  |  password: MBR00003
INSERT INTO users (id, name, email, phoneNumber, passwordHash, memberNumber, role, isActive, createdAt, updatedAt)
VALUES (
  'user-mbr-003',
  'Bima Sakti',
  'member-m0003@internal.vluxe.local',
  '08111111003',
  '[HASH_MBR00003]',    -- ganti dengan hash bcrypt 'MBR00003'
  'M-0003',
  'MEMBER',
  TRUE, NOW(), NOW()
)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- =============================================================
-- MENU ITEMS
-- =============================================================
INSERT INTO menu_items (id, sku, name, category, price, cost, isActive, createdAt, updatedAt) VALUES
  ('menu-001', 'MNM-001', 'Es Teh Manis',   'Minuman', 5000,  2000, TRUE, NOW(), NOW()),
  ('menu-002', 'MNM-002', 'Es Jeruk',        'Minuman', 7000,  3000, TRUE, NOW(), NOW()),
  ('menu-003', 'MNM-003', 'Air Mineral',     'Minuman', 5000,  2000, TRUE, NOW(), NOW()),
  ('menu-004', 'MNM-004', 'Kopi Hitam',      'Minuman', 8000,  3000, TRUE, NOW(), NOW()),
  ('menu-005', 'MKN-001', 'Indomie Goreng',  'Makanan', 15000, 7000, TRUE, NOW(), NOW()),
  ('menu-006', 'MKN-002', 'Nasi Goreng',     'Makanan', 20000, 9000, TRUE, NOW(), NOW()),
  ('menu-007', 'SNK-001', 'Cireng',          'Snack',   10000, 4000, TRUE, NOW(), NOW()),
  ('menu-008', 'SNK-002', 'Keripik',         'Snack',   8000,  3000, TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Update lastSkuNumber di kategori sesuai jumlah item
UPDATE menu_categories SET lastSkuNumber = 4 WHERE skuPrefix = 'MNM';
UPDATE menu_categories SET lastSkuNumber = 2 WHERE skuPrefix = 'MKN';
UPDATE menu_categories SET lastSkuNumber = 2 WHERE skuPrefix = 'SNK';

-- =============================================================
-- STOCK F&B (50 unit tiap item, threshold 5)
-- =============================================================
INSERT INTO stock_fnb (id, menuItemId, qtyOnHand, lowStockThreshold, trackStock, createdAt, updatedAt)
  SELECT
    CONCAT('stock-', id),
    id,
    50,
    5,
    TRUE,
    NOW(),
    NOW()
  FROM menu_items
ON DUPLICATE KEY UPDATE qtyOnHand = VALUES(qtyOnHand);

-- =============================================================
-- SUMMARY AKUN
-- =============================================================
-- Role       | Email                               | Password
-- -----------|-------------------------------------|----------
-- OWNER      | owner@billiard.com                  | owner123
-- MANAGER    | manager@billiard.com                | manager123
-- CASHIER    | kasir1@billiard.com                 | kasir123
-- CASHIER    | kasir2@billiard.com                 | kasir123
-- DEVELOPER  | dev@billiard.com                    | dev123
-- MEMBER     | member-m0001@internal.vluxe.local   | MBR00001
-- MEMBER     | member-m0002@internal.vluxe.local   | MBR00002
-- MEMBER     | member-m0003@internal.vluxe.local   | MBR00003
-- -----------|-------------------------------------|----------
-- PIN OWNER  | (untuk re-auth billing)             | 123456
-- =============================================================
