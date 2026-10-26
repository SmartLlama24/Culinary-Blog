# Olive & Thyme

A responsive culinary magazine frontend built with React, JavaScript, Vite,
React Router, and Supabase Auth. Published recipes and journal posts use
Supabase; the frontend keeps no mock content in the public feeds.

## Getting started

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and set the Supabase project URL and
publishable key. The browser client must never use a secret or service-role
key. Apply `supabase/migrations/20261026140000_create_profiles.sql` to the
project's SQL editor before using authentication. In Supabase Auth URL
configuration, add the local development URL and deployed site URL to the
allowed redirect URLs; configure email confirmation to match the project’s
desired registration flow.

Apply `supabase/migrations/20261026150000_create_recipes.sql` after the profile
migration to enable recipe queries.
Apply `supabase/migrations/20261026160000_create_blog_and_cover_storage.sql`
after the recipe migration to enable journal posts and private cover images.
Apply `supabase/migrations/20261026170000_fix_recipe_timestamp_trigger_and_upload_ids.sql`
to prevent recipe child timestamp triggers from reading a missing `status`
field and to allow admin recipe inserts to use the client-generated ID used in
the Storage object path.

Run `npm run build` to create a production build and `npm run lint` to check
the source with Oxlint.

## Project structure

- `src/App.jsx` — Declares the client-side routes and authentication guards.
- `src/context/AuthProvider.jsx` — Restores the Supabase session, listens for
  auth changes, reads the signed-in user's own profile, and exposes auth
  actions.
- `src/context/useAuth.js` and `src/context/authContext.js` — Shared
  authentication hook and context.
- `src/lib/supabaseClient.js` — Configures the browser client using only the
  public project URL and publishable key.
- `supabase/migrations/20261026140000_create_profiles.sql` — Creates the
  profile table, signup trigger, grants, and RLS policies.
- `supabase/migrations/20261026150000_create_recipes.sql` — Creates recipes,
  ordered ingredients and instructions, timestamp triggers, grants, and RLS
  policies.
- `supabase/migrations/20261026160000_create_blog_and_cover_storage.sql` —
  Creates blog posts and private cover storage with publication-aware read
  policies and admin-only mutations.
- `src/lib/content.js` — Published/admin content queries, mutations, image
  validation and storage access.
- `src/hooks/useContent.js` — Shared async state for published and admin
  content.
- `src/components/EditorialCard.jsx` — Shared feed card linking to recipe or
  journal detail pages.
- `src/lib/recipes.js` — Supabase recipe queries and display formatting.
- `src/hooks/useRecipes.js` — Shared loading/error/data state for recipe
  listing and detail screens.
- `src/main.jsx` — Mounts the React app and loads the global styles.
- `src/index.css` — Global reset, typography, palette, and base accessibility
  styles.
- `src/App.css` — Shared layout, component, page, and responsive styles.
- `src/data/content.js` — Local journal samples retained for the existing
  in-memory favorites preview; these are not used by public feeds.
- `src/context/FavoritesContext.jsx` — In-memory favorites state, reset when
  the page is refreshed; it is not synced to the user account.
- `src/context/useFavorites.js` and `src/context/favoritesContext.js` — The
  shared favorites hook and context instance.
- `src/components/` — Shared navigation, footer, content cards, section
  headings, accessibility helpers, and feedback states.
- `src/pages/` — Home, recipe index/detail, journal index/detail, favorites,
  login/registration, admin dashboard, and not-found routes.

## Planned routes

- `/` — Home
- `/recipes` and `/recipes/:slug` — Published Supabase recipes and details
- `/journal` and `/journal/:slug` — Blog feed and article
- `/favorites` — Signed-in users only; favorites remain in memory.
- `/login` and `/register` — Supabase email/password authentication.
- `/admin` — Signed-in users whose database profile role is `admin`.

## Profile and admin security

The migration creates a profile automatically after a new Auth user is
inserted. The trigger always sets `role` to `user` and ignores any role supplied
in signup metadata. Row Level Security allows users to read their own profile;
column-level grants permit updating `display_name` but not `role`. There are no
client insert/delete privileges or policies for profiles.

To promote a user, use the Supabase SQL editor as a trusted project operator:

```sql
update public.profiles
set role = 'admin'
where id = 'AUTH_USER_UUID';
```

Never promote users through frontend code or user-editable metadata. The admin
route checks the profile role for navigation and user experience; any future
admin data tables must also enforce authorization with their own database RLS
policies. Authentication, registration confirmation, and profile reads depend
on the Supabase project settings and the migration being applied.

## Recipe and journal data security

Recipes reference `profiles` through `created_by`; each recipe has ordered
ingredients and ordered instructions in child tables that cascade on recipe
deletion. Recipes include preparation/cooking minutes, servings, draft or
published status, publication time, and creation/update timestamps. Ingredient
quantities are numeric with an optional unit and notes.

Blog posts have a title, unique slug, excerpt, category, body, cover image
reference, status, publication time, and creation/update timestamps.

Both migrations enable RLS and restrict table grants. Anonymous and signed-in
non-admin users can query only published rows and published recipe children.
Only admins, verified by their protected `profiles.role`, can read and manage
drafts. The homepage merges published recipes and posts and sorts by
`published_at`; public recipe and journal detail routes also explicitly filter
to published content. Recipe search filters loaded published titles,
descriptions, categories, and ingredient names.

Cover images are held in the private `culinary-covers` bucket. Uploads are
limited to JPEG, PNG, WebP, or AVIF files up to 5 MB and are decoded before
upload. Storage policies allow reads only for admins or images referenced by
published content. Restrictive policies also prevent any other permissive
storage policy from exposing unpublished cover objects in this bucket.
Admin saves await Storage's upload response before writing its returned object
path to a recipe or post. If a later recipe-child write fails after the recipe
row has saved, cleanup checks whether that row references the new image and
keeps the object when it does; this avoids leaving a dangling cover path.
Development logs include upload outcome and safe Storage error metadata, but
never log object paths, filenames, credentials, or content.

The admin dashboard can create, edit, preview, publish, unpublish, and delete
recipes and journal posts. Recipe ingredients and ordered instructions are
managed with each recipe. There are no reviews or comments features; favorites
remain the earlier in-memory frontend preview and are not synced to Supabase.
If a cover-image object is missing or unreadable, its content remains available
without the image; development builds log the Storage error name, message,
code, and status without logging the object path or credentials. Other Storage
errors still fail the content request.

### Deployment and security checks

1. Apply the migrations in order: profile, recipes, then blog/storage.
2. Ensure the initial admin account has been promoted using the trusted SQL
   editor procedure above; never add admin assignment to the client.
3. Configure Supabase Auth redirect URLs for local and deployed app origins.
4. Keep the `culinary-covers` bucket private and verify there are no broad
   pre-existing Storage policies that alter intended access outside that
   bucket. This migration adds restrictive rules for this bucket.
5. Verify the anon key can select only `status = 'published'` rows from both
   content tables and receives no rows for drafts, including nested recipe
   children. Verify authenticated non-admin insert/update/delete attempts
   fail, while admins can manage content.
6. Verify anonymous and non-admin requests cannot download a draft cover
   image, while a published cover can be signed and read.

This repository does not include a Supabase local stack or database test
runner. Browser build/lint checks do not replace those live role-policy tests.
