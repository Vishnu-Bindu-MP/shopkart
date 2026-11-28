INSERT INTO products (name, description, price, stock) VALUES
  ('Cotton Kurti', 'Soft blue cotton kurti', 399.00, 25),
  ('Phone Cover', 'Black silicone cover', 149.50, 100),
  ('Steel Bottle', '1 litre insulated bottle', 549.00, 40);

INSERT INTO promo_codes
  (code, discount_type, discount_value, min_order_amount, valid_from, valid_to, max_uses)
VALUES
  ('SAVE10',  'percentage', 10,  500,  NOW() - INTERVAL '1 day', NOW() + INTERVAL '365 days', 100),
  ('FLAT100', 'fixed',      100, NULL, NULL, NULL, NULL);