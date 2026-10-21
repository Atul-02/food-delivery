// Creates an admin, a demo owner with two approved restaurants and menus,
// and a demo customer with an address. Safe to run more than once.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, type Role } from '@prisma/client';

const prisma = new PrismaClient();

async function upsertUser(email: string, name: string, role: Role, password: string) {
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role, passwordHash: await bcrypt.hash(password, 10) },
  });
}

const demoRestaurants = [
  {
    name: 'Spice Route',
    description: 'North Indian curries and tandoor',
    cuisines: ['north indian', 'mughlai'],
    addressLine: '12 MG Road',
    city: 'Pune',
    pincode: '411001',
    menu: {
      Starters: [
        { name: 'Paneer Tikka', price: 24000, isVeg: true },
        { name: 'Chicken Tikka', price: 28000, isVeg: false },
      ],
      'Main Course': [
        { name: 'Butter Chicken', price: 32000, isVeg: false },
        { name: 'Dal Makhani', price: 22000, isVeg: true },
      ],
      Breads: [
        { name: 'Butter Naan', price: 5000, isVeg: true },
        { name: 'Tandoori Roti', price: 3000, isVeg: true },
      ],
    },
  },
  {
    name: 'Dosa Corner',
    description: 'Crispy dosas and filter coffee',
    cuisines: ['south indian'],
    addressLine: '4 FC Road',
    city: 'Pune',
    pincode: '411004',
    menu: {
      Dosas: [
        { name: 'Masala Dosa', price: 12000, isVeg: true },
        { name: 'Mysore Masala Dosa', price: 14000, isVeg: true },
      ],
      Beverages: [{ name: 'Filter Coffee', price: 4000, isVeg: true }],
    },
  },
];

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@fooddelivery.local';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@12345';
  await upsertUser(adminEmail, 'Admin', 'ADMIN', adminPassword);

  const owner = await upsertUser('owner@demo.local', 'Demo Owner', 'RESTAURANT_OWNER', 'Owner@12345');
  const customer = await upsertUser('customer@demo.local', 'Demo Customer', 'CUSTOMER', 'Customer@12345');

  if ((await prisma.address.count({ where: { userId: customer.id } })) === 0) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        label: 'Home',
        line1: '221 Baker Street',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
        isDefault: true,
      },
    });
  }

  for (const { menu, ...data } of demoRestaurants) {
    const exists = await prisma.restaurant.findFirst({ where: { ownerId: owner.id, name: data.name } });
    if (exists) continue;

    const restaurant = await prisma.restaurant.create({
      data: { ...data, ownerId: owner.id, isApproved: true, isOpen: true },
    });

    let sortOrder = 0;
    for (const [categoryName, items] of Object.entries(menu)) {
      await prisma.menuCategory.create({
        data: {
          restaurantId: restaurant.id,
          name: categoryName,
          sortOrder: sortOrder++,
          items: { create: items.map((item) => ({ ...item, restaurantId: restaurant.id })) },
        },
      });
    }
  }

  console.log('Seed complete.');
  console.log(`  Admin:    ${adminEmail} / ${adminPassword}`);
  console.log('  Owner:    owner@demo.local / Owner@12345');
  console.log('  Customer: customer@demo.local / Customer@12345');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
