import "dotenv/config";
import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/diagnose-auth-trigger.js <email>");
  process.exit(1);
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DIRECT_URL or DATABASE_URL is required.");
  process.exit(1);
}

const client = new pg.Client({ connectionString });
await client.connect();

try {
  const trigger = await client.query(`
    select t.tgname, t.tgenabled, pg_get_triggerdef(t.oid) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth'
      and c.relname = 'users'
      and not t.tgisinternal
  `);
  const fn = await client.query(`
    select p.proname,
           pg_get_userbyid(p.proowner) as owner,
           p.prosecdef as security_definer,
           pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'handle_new_user'
  `);
  const columns = await client.query(`
    select column_name, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
    order by ordinal_position
  `);
  const constraints = await client.query(`
    select conname, pg_get_constraintdef(oid) as definition
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
  `);
  const counts = await client.query(
    `select
       (select count(*)::int from auth.users where email = $1) as auth_users,
       (select count(*)::int from public.profiles where email = $1) as profiles`,
    [email],
  );

  console.log(
    JSON.stringify(
      {
        trigger: trigger.rows,
        function: fn.rows,
        profileColumns: columns.rows,
        profileConstraints: constraints.rows,
        matchingRecordCounts: counts.rows[0],
      },
      null,
      2,
    ),
  );
} finally {
  await client.end();
}
