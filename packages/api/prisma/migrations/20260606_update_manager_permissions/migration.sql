-- Update existing manager users with product creation and inventory management permissions
UPDATE users
SET permissions = jsonb_set(
  jsonb_set(
    jsonb_set(
      permissions,
      '{products,create}',
      'true'
    ),
    '{inventory,addStock}',
    'true'
  ),
  '{inventory,removeStock}',
  'true'
)
WHERE role = 'manager';
