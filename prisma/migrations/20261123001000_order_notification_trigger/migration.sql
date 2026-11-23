-- Keep order-placement notifications atomic with the order insert. This also
-- protects notification delivery while older application instances are being
-- replaced during a rolling deployment.
CREATE OR REPLACE FUNCTION public.create_order_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  customer_event TEXT;
  customer_label TEXT;
  order_label TEXT;
  total_label TEXT;
BEGIN
  customer_event := CASE
    WHEN NEW.reordered_from IS NULL THEN 'order_placed'
    ELSE 'order_reordered'
  END;
  order_label := COALESCE(NEW.order_number, NEW.id::TEXT);
  total_label := NEW.currency || ' ' || TRIM(TO_CHAR(NEW.total, 'FM999999999990.00'));

  SELECT COALESCE(NULLIF(profile.full_name, ''), profile.email, 'A customer')
  INTO customer_label
  FROM public.profiles AS profile
  WHERE profile.id = NEW.customer_id;

  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    data,
    dedupe_key
  )
  VALUES (
    NEW.customer_id,
    customer_event,
    CASE
      WHEN NEW.reordered_from IS NULL THEN 'Order ' || order_label || ' received'
      ELSE 'Reorder ' || order_label || ' received'
    END,
    'We received your ' ||
      CASE WHEN NEW.reordered_from IS NULL THEN 'order' ELSE 'reorder' END ||
      ' for ' || total_label || '.',
    JSONB_BUILD_OBJECT('orderId', NEW.id, 'orderNumber', order_label),
    customer_event || '/' || NEW.id::TEXT
  )
  ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;

  INSERT INTO public.notifications (
    recipient_id,
    type,
    title,
    message,
    data,
    dedupe_key
  )
  SELECT
    admin.id,
    CASE
      WHEN NEW.reordered_from IS NULL THEN 'new_order'
      ELSE 'customer_reordered'
    END,
    CASE
      WHEN NEW.reordered_from IS NULL THEN 'New order: ' || order_label
      ELSE 'New reorder: ' || order_label
    END,
    COALESCE(customer_label, 'A customer') || ' placed ' || order_label ||
      ' for ' || total_label || '.',
    JSONB_BUILD_OBJECT(
      'orderId', NEW.id,
      'orderNumber', order_label,
      'customerId', NEW.customer_id
    ),
    customer_event || '/' || NEW.id::TEXT
  FROM public.profiles AS admin
  WHERE admin.role = 'admin'
  ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_notifications() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS orders_create_notifications ON public.orders;
CREATE TRIGGER orders_create_notifications
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.create_order_notifications();

-- Repair orders placed after the notification table was enabled but before the
-- database trigger existed. ON CONFLICT makes the repair safe to rerun.
INSERT INTO public.notifications (
  recipient_id,
  type,
  title,
  message,
  data,
  dedupe_key,
  created_at
)
SELECT
  orders.customer_id,
  CASE WHEN orders.reordered_from IS NULL THEN 'order_placed' ELSE 'order_reordered' END,
  CASE
    WHEN orders.reordered_from IS NULL THEN 'Order ' || orders.order_number || ' received'
    ELSE 'Reorder ' || orders.order_number || ' received'
  END,
  'We received your ' ||
    CASE WHEN orders.reordered_from IS NULL THEN 'order' ELSE 'reorder' END ||
    ' for ' || orders.currency || ' ' ||
    TRIM(TO_CHAR(orders.total, 'FM999999999990.00')) || '.',
  JSONB_BUILD_OBJECT('orderId', orders.id, 'orderNumber', orders.order_number),
  CASE WHEN orders.reordered_from IS NULL THEN 'order_placed' ELSE 'order_reordered' END ||
    '/' || orders.id::TEXT,
  orders.created_at
FROM public.orders AS orders
WHERE orders.created_at >= COALESCE(
  (
    SELECT migration.finished_at
    FROM public._prisma_migrations AS migration
    WHERE migration.migration_name = '20261123000000_notifications'
  ),
  CURRENT_TIMESTAMP
)
ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;

INSERT INTO public.notifications (
  recipient_id,
  type,
  title,
  message,
  data,
  dedupe_key,
  created_at
)
SELECT
  admin.id,
  CASE WHEN orders.reordered_from IS NULL THEN 'new_order' ELSE 'customer_reordered' END,
  CASE
    WHEN orders.reordered_from IS NULL THEN 'New order: ' || orders.order_number
    ELSE 'New reorder: ' || orders.order_number
  END,
  COALESCE(NULLIF(customer.full_name, ''), customer.email, 'A customer') ||
    ' placed ' || orders.order_number || ' for ' || orders.currency || ' ' ||
    TRIM(TO_CHAR(orders.total, 'FM999999999990.00')) || '.',
  JSONB_BUILD_OBJECT(
    'orderId', orders.id,
    'orderNumber', orders.order_number,
    'customerId', orders.customer_id
  ),
  CASE WHEN orders.reordered_from IS NULL THEN 'order_placed' ELSE 'order_reordered' END ||
    '/' || orders.id::TEXT,
  orders.created_at
FROM public.orders AS orders
JOIN public.profiles AS customer ON customer.id = orders.customer_id
CROSS JOIN public.profiles AS admin
WHERE admin.role = 'admin'
  AND orders.created_at >= COALESCE(
    (
      SELECT migration.finished_at
      FROM public._prisma_migrations AS migration
      WHERE migration.migration_name = '20261123000000_notifications'
    ),
    CURRENT_TIMESTAMP
  )
ON CONFLICT (recipient_id, dedupe_key) DO NOTHING;
