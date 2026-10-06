/**
 * Seed file - DEVELOPMENT ONLY
 * Creates initial admin, categories, settings, and payment methods
 * Run: npm run seed
 */
import { PrismaClient, AdminRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─── Super Admin ───
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345!';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Admin created: ${admin.username}`);

  // ─── Categories ───
  const categories = [
    { name: 'Chinese Drama', nameKh: 'រឿងចិន', slug: 'chinese', sortOrder: 1 },
    { name: 'Korean Drama', nameKh: 'រឿងកូរ៉េ', slug: 'korean', sortOrder: 2 },
    { name: 'Thai Drama', nameKh: 'រឿងថៃ', slug: 'thai', sortOrder: 3 },
    { name: 'Khmer Movie', nameKh: 'រឿងខ្មែរ', slug: 'khmer', sortOrder: 4 },
    { name: 'Romance', nameKh: 'រឿងស្នេហា', slug: 'romance', sortOrder: 5 },
    { name: 'Historical', nameKh: 'រឿងបុរាណ', slug: 'historical', sortOrder: 6 },
    { name: 'Comedy', nameKh: 'រឿងកំប្លែង', slug: 'comedy', sortOrder: 7 },
    { name: 'Martial Arts', nameKh: 'រឿងប្រយុទ្ធ', slug: 'martial-arts', sortOrder: 8 },
    { name: 'Fantasy', nameKh: 'រឿង Fantasy', slug: 'fantasy', sortOrder: 9 },
    { name: 'Action', nameKh: 'រឿង Action', slug: 'action', sortOrder: 10 },
    { name: 'Drama', nameKh: 'រឿង Drama', slug: 'drama', sortOrder: 11 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { ...cat, isActive: true },
    });
  }
  console.log(`✅ ${categories.length} categories created`);

  // ─── Settings ───
  const settings = [
    { key: 'app_name', value: 'អាធិរាជរឿង' },
    { key: 'app_tagline', value: 'រឿងល្អៗ នៅជិតអ្នកជានិច្ច' },
    { key: 'currency', value: 'USD' },
    { key: 'currency_symbol', value: '$' },
    { key: 'min_deposit', value: '1.00' },
    { key: 'max_deposit', value: '1000.00' },
    { key: 'maintenance_mode', value: 'false' },
    { key: 'support_contact', value: '' },
    { key: 'terms_url', value: '' },
    { key: 'privacy_url', value: '' },
    { key: 'telegram_bot_username', value: process.env.TELEGRAM_BOT_USERNAME || '' },
    { key: 'notification_deposit_success', value: 'true' },
    { key: 'notification_purchase_success', value: 'true' },
    { key: 'notification_new_episode', value: 'true' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: { key: setting.key, value: setting.value },
    });
  }
  console.log(`✅ ${settings.length} settings created`);

  // ─── Payment Method ───
  await prisma.paymentMethod.upsert({
    where: { id: 'manual-payment-method' },
    update: {},
    create: {
      id: 'manual-payment-method',
      name: 'Manual Bank Transfer',
      nameKh: 'ផ្ទេរប្រាក់ដោយផ្ទាល់',
      provider: 'manual',
      isActive: true,
      config: {
        bankName: 'ABA Bank',
        accountNumber: '000123456789',
        accountName: 'អាធិរាជរឿង',
        qrImageUrl: '',
      },
      instructions: 'Transfer to the account above and upload proof of payment.',
      instructionsKh: 'សូមផ្ទេរប្រាក់ទៅគណនីខាងលើ ហើយបញ្ជូនរូបភាពបញ្ជាក់ការទូទាត់។',
      minAmount: 1.00,
      maxAmount: 1000.00,
      sortOrder: 0,
    },
  });
  console.log('✅ Payment method created');

  console.log('\n🎉 Seed completed successfully!');
  console.log(`\n🔐 Admin credentials:`);
  console.log(`   Username: admin`);
  console.log(`   Password: ${adminPassword}`);
  console.log('\n⚠️  Change admin password immediately in production!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
