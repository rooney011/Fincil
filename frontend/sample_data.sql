-- ========================================
-- Sample Transaction Data for Testing
-- ========================================
--
-- INSTRUCTIONS:
-- 1. First, get your user ID by running:
--    SELECT id FROM auth.users WHERE email = 'your@email.com';
-- 2. Replace 'YOUR_USER_ID_HERE' below with your actual UUID
-- 3. Run this entire script in Supabase SQL Editor
--
-- This will create realistic transaction history for testing
-- the AI Financial Council's debate system.
-- ========================================

-- Sample transactions for a freelancer with variable income
INSERT INTO transactions (user_id, amount, description, category, transaction_date)
VALUES
  -- Income
  ('YOUR_USER_ID_HERE', 3500.00, 'Website design project - Client A', 'freelance', NOW() - INTERVAL '5 days'),
  ('YOUR_USER_ID_HERE', 2000.00, 'Logo design - Client B', 'freelance', NOW() - INTERVAL '15 days'),
  ('YOUR_USER_ID_HERE', 1500.00, 'Consulting session', 'freelance', NOW() - INTERVAL '25 days'),

  -- Essential Expenses
  ('YOUR_USER_ID_HERE', -1200.00, 'Rent payment', 'bills', NOW() - INTERVAL '2 days'),
  ('YOUR_USER_ID_HERE', -150.00, 'Electric bill', 'bills', NOW() - INTERVAL '10 days'),
  ('YOUR_USER_ID_HERE', -80.00, 'Internet and phone', 'bills', NOW() - INTERVAL '12 days'),
  ('YOUR_USER_ID_HERE', -60.00, 'Water bill', 'bills', NOW() - INTERVAL '15 days'),

  -- Groceries
  ('YOUR_USER_ID_HERE', -120.00, 'Whole Foods weekly shopping', 'groceries', NOW() - INTERVAL '1 day'),
  ('YOUR_USER_ID_HERE', -95.00, 'Trader Joes groceries', 'groceries', NOW() - INTERVAL '8 days'),
  ('YOUR_USER_ID_HERE', -110.00, 'Costco bulk shopping', 'groceries', NOW() - INTERVAL '16 days'),

  -- Coffee & Dining
  ('YOUR_USER_ID_HERE', -15.50, 'Starbucks morning coffee', 'coffee', NOW() - INTERVAL '1 day'),
  ('YOUR_USER_ID_HERE', -12.00, 'Local cafe latte', 'coffee', NOW() - INTERVAL '3 days'),
  ('YOUR_USER_ID_HERE', -18.50, 'Coffee and pastry', 'coffee', NOW() - INTERVAL '5 days'),
  ('YOUR_USER_ID_HERE', -65.00, 'Dinner at Italian restaurant', 'dining', NOW() - INTERVAL '4 days'),
  ('YOUR_USER_ID_HERE', -42.00, 'Lunch with client', 'dining', NOW() - INTERVAL '9 days'),
  ('YOUR_USER_ID_HERE', -85.00, 'Date night at steakhouse', 'dining', NOW() - INTERVAL '14 days'),

  -- Transportation
  ('YOUR_USER_ID_HERE', -45.00, 'Uber rides this week', 'transport', NOW() - INTERVAL '2 days'),
  ('YOUR_USER_ID_HERE', -35.00, 'Gas station fill-up', 'gas', NOW() - INTERVAL '7 days'),
  ('YOUR_USER_ID_HERE', -28.00, 'Uber to airport', 'transport', NOW() - INTERVAL '11 days'),
  ('YOUR_USER_ID_HERE', -40.00, 'Gas for road trip', 'gas', NOW() - INTERVAL '18 days'),

  -- Health & Fitness
  ('YOUR_USER_ID_HERE', -120.00, 'Gym membership renewal', 'gym', NOW() - INTERVAL '5 days'),
  ('YOUR_USER_ID_HERE', -45.00, 'Pharmacy prescription', 'medical', NOW() - INTERVAL '13 days'),
  ('YOUR_USER_ID_HERE', -25.00, 'Vitamins and supplements', 'health', NOW() - INTERVAL '20 days'),

  -- Shopping & Entertainment
  ('YOUR_USER_ID_HERE', -199.99, 'Sony WH-1000XM5 headphones', 'electronics', NOW() - INTERVAL '6 days'),
  ('YOUR_USER_ID_HERE', -89.99, 'New running shoes', 'clothing', NOW() - INTERVAL '12 days'),
  ('YOUR_USER_ID_HERE', -45.00, 'Books from Amazon', 'shopping', NOW() - INTERVAL '17 days'),
  ('YOUR_USER_ID_HERE', -15.99, 'Netflix subscription', 'subscriptions', NOW() - INTERVAL '3 days'),
  ('YOUR_USER_ID_HERE', -12.99, 'Spotify Premium', 'subscriptions', NOW() - INTERVAL '8 days'),
  ('YOUR_USER_ID_HERE', -35.00, 'Movie tickets and popcorn', 'entertainment', NOW() - INTERVAL '10 days'),

  -- Professional Development
  ('YOUR_USER_ID_HERE', -49.00, 'Udemy course on AI', 'education', NOW() - INTERVAL '4 days'),
  ('YOUR_USER_ID_HERE', -29.00, 'Adobe Creative Cloud', 'subscriptions', NOW() - INTERVAL '15 days'),
  ('YOUR_USER_ID_HERE', -20.00, 'LinkedIn Premium', 'subscriptions', NOW() - INTERVAL '22 days'),

  -- Savings & Investments
  ('YOUR_USER_ID_HERE', -500.00, 'Transfer to savings account', 'savings', NOW() - INTERVAL '5 days'),
  ('YOUR_USER_ID_HERE', -300.00, 'Investment in index fund', 'investment', NOW() - INTERVAL '15 days');

-- Optional: Add more varied transactions for different scenarios
INSERT INTO transactions (user_id, amount, description, category, transaction_date)
VALUES
  -- Unexpected expenses
  ('YOUR_USER_ID_HERE', -350.00, 'Car repair - brake pads', 'maintenance', NOW() - INTERVAL '19 days'),
  ('YOUR_USER_ID_HERE', -125.00, 'Emergency dentist visit', 'medical', NOW() - INTERVAL '21 days'),

  -- Luxury/discretionary
  ('YOUR_USER_ID_HERE', -250.00, 'Weekend trip hotel', 'travel', NOW() - INTERVAL '23 days'),
  ('YOUR_USER_ID_HERE', -75.00, 'Concert tickets', 'entertainment', NOW() - INTERVAL '27 days'),

  -- Side income
  ('YOUR_USER_ID_HERE', 150.00, 'Sold old laptop on eBay', 'side_hustle', NOW() - INTERVAL '14 days'),
  ('YOUR_USER_ID_HERE', 75.00, 'Cashback rewards', 'income', NOW() - INTERVAL '20 days');

-- Verify the data was inserted
SELECT
  COUNT(*) as total_transactions,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_expenses,
  SUM(amount) as net_change
FROM transactions
WHERE user_id = 'YOUR_USER_ID_HERE';

-- View recent transactions by category
SELECT
  category,
  COUNT(*) as count,
  SUM(amount) as total
FROM transactions
WHERE user_id = 'YOUR_USER_ID_HERE'
GROUP BY category
ORDER BY total DESC;
