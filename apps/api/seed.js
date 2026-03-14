/**
 * Billiard POS v2 — Sample Account Seed
 * 
 * Jalankan SETELAH npm install:
 *   node seed.js
 */

const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const accounts = [
  {
    role: 'OWNER',
    name: 'Budi Santoso',
    email: 'owner@billiard.com',
    phoneNumber: '081234567890',
    password: 'owner123',
    pin: '123456',
  },
  {
    role: 'MANAGER',
    name: 'Sari Dewi',
    email: 'manager@billiard.com',
    phoneNumber: '081234567891',
    password: 'manager123',
  },
  {
    role: 'CASHIER',
    name: 'Andi Pratama',
    email: 'kasir1@billiard.com',
    phoneNumber: '081234567892',
    password: 'kasir123',
  },
  {
    role: 'CASHIER',
    name: 'Lina Agustina',
    email: 'kasir2@billiard.com',
    phoneNumber: '081234567893',
    password: 'kasir123',
  },
  {
    role: 'DEVELOPER',
    name: 'Rizky Developer',
    email: 'dev@billiard.com',
    phoneNumber: '081234567894',
    password: 'dev123',
  },
];

const members = [
  { name: 'Ahmad Fauzi',   phoneNumber: '08111111001' },
  { name: 'Dewi Rahayu',   phoneNumber: '08111111002' },
  { name: 'Bima Sakti',    phoneNumber: '08111111003' },
];

const tables = [
  { name: 'Meja 1', hourlyRate: 25000 },
  { name: 'Meja 2', hourlyRate: 25000 },
  { name: 'Meja 3', hourlyRate: 25000 },
  { name: 'Meja 4', hourlyRate: 30000 },
  { name: 'Meja 5', hourlyRate: 30000 },
];

const menuCategories = [
  { name: 'Minuman',  skuPrefix: 'MNM' },
  { name: 'Makanan',  skuPrefix: 'MKN' },
  { name: 'Snack',    skuPrefix: 'SNK' },
];

const menuItems = [
  { name: 'Es Teh Manis',   category: 'Minuman', price: 5000,  cost: 2000 },
  { name: 'Es Jeruk',       category: 'Minuman', price: 7000,  cost: 3000 },
  { name: 'Air Mineral',    category: 'Minuman', price: 5000,  cost: 2000 },
  { name: 'Kopi Hitam',     category: 'Minuman', price: 8000,  cost: 3000 },
  { name: 'Indomie Goreng', category: 'Makanan', price: 15000, cost: 7000 },
  { name: 'Nasi Goreng',    category: 'Makanan', price: 20000, cost: 9000 },
  { name: 'Cireng',         category: 'Snack',   price: 10000, cost: 4000 },
  { name: 'Keripik',        category: 'Snack',   price: 8000,  cost: 3000 },
];

async function generateMemberNumber(index) {
  return `M-${String(index + 1).padStart(4, '0')}`;
}

async function main() {
  console.log('🎱 Billiard POS v2 — Seed dimulai...\n');

  // ── Staff Accounts ─────────────────────────────────────────────
  console.log('👤 Membuat akun staff...');
  for (const acc of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: acc.email } });
    if (existing) {
      console.log(`  ⏭  ${acc.role} ${acc.email} sudah ada, skip.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(acc.password, SALT_ROUNDS);
    const pinHash = acc.pin ? await bcrypt.hash(acc.pin, SALT_ROUNDS) : null;

    await prisma.user.create({
      data: {
        name: acc.name,
        email: acc.email,
        phoneNumber: acc.phoneNumber,
        passwordHash,
        pin: pinHash,
        role: acc.role,
        isActive: true,
      },
    });
    console.log(`  ✅  ${acc.role.padEnd(10)} ${acc.email}  (password: ${acc.password})`);
  }

  // ── Member Accounts ────────────────────────────────────────────
  console.log('\n👥 Membuat akun member...');
  for (let i = 0; i < members.length; i++) {
    const m = members[i];
    const memberNumber = await generateMemberNumber(i);
    const email = `member-${memberNumber.toLowerCase().replace('-', '')}@internal.vluxe.local`;
    const rawPassword = `MBR${String(i + 1).padStart(5, '0')}`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.log(`  ⏭  MEMBER ${email} sudah ada, skip.`);
      continue;
    }

    const passwordHash = await bcrypt.hash(rawPassword, SALT_ROUNDS);
    await prisma.user.create({
      data: {
        name: m.name,
        email,
        phoneNumber: m.phoneNumber,
        passwordHash,
        role: 'MEMBER',
        memberNumber,
        isActive: true,
      },
    });
    console.log(`  ✅  MEMBER     ${email}  (password: ${rawPassword})`);
  }

  // ── Tables ─────────────────────────────────────────────────────
  console.log('\n🎱 Membuat meja...');
  for (let i = 0; i < tables.length; i++) {
    const t = tables[i];
    const id = `table-${String(i + 1).padStart(2, '0')}`;
    const existing = await prisma.table.findUnique({ where: { id } });
    if (existing) {
      console.log(`  ⏭  ${t.name} sudah ada, skip.`);
      continue;
    }
    await prisma.table.create({
      data: {
        id,
        name: t.name,
        hourlyRate: t.hourlyRate,
        status: 'AVAILABLE',
        isActive: true,
      },
    });
    console.log(`  ✅  ${t.name}  Rp ${t.hourlyRate.toLocaleString('id-ID')}/jam`);
  }

  // ── Menu Categories ────────────────────────────────────────────
  console.log('\n🍔 Membuat kategori menu...');
  for (const cat of menuCategories) {
    const existing = await prisma.menuCategory.findUnique({ where: { name: cat.name } });
    if (existing) {
      console.log(`  ⏭  Kategori ${cat.name} sudah ada, skip.`);
      continue;
    }
    await prisma.menuCategory.create({ data: cat });
    console.log(`  ✅  ${cat.name} (${cat.skuPrefix})`);
  }

  // ── Menu Items ─────────────────────────────────────────────────
  console.log('\n🍜 Membuat menu item...');
  for (const item of menuItems) {
    const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
    if (existing) {
      console.log(`  ⏭  ${item.name} sudah ada, skip.`);
      continue;
    }

    const cat = await prisma.menuCategory.findUnique({ where: { name: item.category } });
    if (!cat) continue;

    const updatedCat = await prisma.menuCategory.update({
      where: { id: cat.id },
      data: { lastSkuNumber: { increment: 1 } },
    });
    const sku = `${updatedCat.skuPrefix}-${String(updatedCat.lastSkuNumber).padStart(3, '0')}`;

    const created = await prisma.menuItem.create({
      data: {
        sku,
        name: item.name,
        category: item.category,
        price: item.price,
        cost: item.cost,
        isActive: true,
      },
    });
    await prisma.stockFnb.create({
      data: {
        menuItemId: created.id,
        qtyOnHand: 50,
        lowStockThreshold: 5,
        trackStock: true,
      },
    });
    console.log(`  ✅  [${sku}] ${item.name}  Rp ${item.price.toLocaleString('id-ID')}`);
  }

  // ── Company Profile ────────────────────────────────────────────
  console.log('\n🏢 Membuat profil perusahaan...');
  const existingCompany = await prisma.companyProfile.findFirst();
  if (!existingCompany) {
    await prisma.companyProfile.create({
      data: {
        name: 'Billiard Center',
        address: 'Jl. Contoh No. 1, Kota Anda',
        phoneNumber: '081234567890',
      },
    });
    console.log('  ✅  CompanyProfile dibuat');
  } else {
    console.log('  ⏭  CompanyProfile sudah ada, skip.');
  }

  console.log('\n' + '='.repeat(55));
  console.log('✅  SEED SELESAI!\n');
  console.log('📋 AKUN LOGIN:');
  console.log('─'.repeat(55));
  console.log('  OWNER     owner@billiard.com         / owner123');
  console.log('  MANAGER   manager@billiard.com       / manager123');
  console.log('  KASIR 1   kasir1@billiard.com        / kasir123');
  console.log('  KASIR 2   kasir2@billiard.com        / kasir123');
  console.log('  DEVELOPER dev@billiard.com           / dev123');
  console.log('  MEMBER 1  member-m0001@intern...     / MBR00001');
  console.log('  MEMBER 2  member-m0002@intern...     / MBR00002');
  console.log('  MEMBER 3  member-m0003@intern...     / MBR00003');
  console.log('─'.repeat(55));
  console.log('  PIN OWNER (re-auth billing): 123456');
  console.log('='.repeat(55));
}

main()
  .catch((e) => { console.error('❌ Seed gagal:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
