-- =============================================================
-- Run this in your Supabase SQL Editor (https://supabase.com)
-- 1. Creates safe_numeric() helper + get_po_analytics() function
-- 2. Function uses SECURITY DEFINER to bypass RLS
-- 3. Grants execute to anon role
-- =============================================================

CREATE OR REPLACE FUNCTION safe_numeric(val text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF val IS NULL OR TRIM(val) = '' THEN
    RETURN NULL;
  END IF;
  RETURN CAST(REPLACE(TRIM(val), ',', '') AS numeric);
EXCEPTION WHEN OTHERS THEN
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION get_po_analytics(
  p_project text DEFAULT NULL,
  p_supplier text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_total_spend      numeric;
  v_active_prs       integer;
  v_active_projects  integer;
  v_active_suppliers integer;
  v_avg_po_value     numeric;
  v_top_projects     json;
  v_top_suppliers    json;
  v_recent_activity  json;
  v_project_list     json;
  v_supplier_list    json;
BEGIN
  -- KPIs
  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM("Req Ref"), ''), NULLIF(TRIM("Ref"), ''), 'N/A') AS pr_ref,
      COALESCE(NULLIF(TRIM("Project"), ''),  'Unknown')                     AS project_name,
      COALESCE(NULLIF(TRIM("Supplier"), ''), 'Unknown')                     AS supplier_name,
      COALESCE(safe_numeric("Total Price"),
               safe_numeric("Net Price"),
               safe_numeric("Original Pirce"), 0)                           AS total_price
    FROM po_data
    WHERE (p_project IS NULL OR TRIM("Project") = p_project)
      AND (p_supplier IS NULL OR TRIM("Supplier") = p_supplier)
  )
  SELECT
    SUM(total_price),
    COUNT(DISTINCT pr_ref),
    COUNT(DISTINCT project_name),
    COUNT(DISTINCT supplier_name),
    CASE WHEN COUNT(DISTINCT pr_ref) > 0
         THEN SUM(total_price) / COUNT(DISTINCT pr_ref)
         ELSE 0 END
  INTO v_total_spend, v_active_prs, v_active_projects,
       v_active_suppliers, v_avg_po_value
  FROM base;

  -- Top 10 Projects by Spend
  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM("Project"), ''), 'Unknown') AS project_name,
      COALESCE(safe_numeric("Total Price"),
               safe_numeric("Net Price"),
               safe_numeric("Original Pirce"), 0)      AS total_price
    FROM po_data
    WHERE (p_project IS NULL OR TRIM("Project") = p_project)
      AND (p_supplier IS NULL OR TRIM("Supplier") = p_supplier)
  ),
  agg AS (
    SELECT
      project_name AS name,
      SUM(total_price) AS spend,
      ROUND(SUM(total_price) * 100.0 / NULLIF(SUM(SUM(total_price)) OVER (), 0), 1) AS share
    FROM base
    GROUP BY project_name
    ORDER BY spend DESC
    LIMIT 10
  )
  SELECT json_agg(json_build_object('name', name, 'spend', spend, 'share', share))
  INTO v_top_projects FROM agg;

  -- Top 10 Suppliers by Spend
  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM("Supplier"), ''), 'Unknown') AS supplier_name,
      COALESCE(NULLIF(TRIM("Project"), ''), 'Unknown')  AS project_name,
      COALESCE(safe_numeric("Total Price"),
               safe_numeric("Net Price"),
               safe_numeric("Original Pirce"), 0)       AS total_price
    FROM po_data
    WHERE (p_project IS NULL OR TRIM("Project") = p_project)
      AND (p_supplier IS NULL OR TRIM("Supplier") = p_supplier)
  ),
  agg AS (
    SELECT
      supplier_name AS name,
      SUM(total_price) AS spend,
      COUNT(*)         AS orders,
      COUNT(DISTINCT project_name) AS projects,
      ROUND(SUM(total_price) * 100.0 / NULLIF(SUM(SUM(total_price)) OVER (), 0), 1) AS share
    FROM base
    GROUP BY supplier_name
    ORDER BY spend DESC
    LIMIT 10
  )
  SELECT json_agg(json_build_object('name', name, 'spend', spend, 'orders', orders, 'projects', projects, 'share', share))
  INTO v_top_suppliers FROM agg;

  -- Recent Activity (top 15 by value)
  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM("Req Ref"), ''), NULLIF(TRIM("Ref"), ''), 'N/A') AS pr,
      COALESCE(NULLIF(TRIM("Project"), ''),  '—')                           AS project,
      COALESCE(NULLIF(TRIM("Supplier"), ''), '—')                           AS supplier,
      COALESCE(NULLIF(TRIM("Ref"), ''), '—')                                AS material,
      COALESCE(safe_numeric("Total Price"),
               safe_numeric("Net Price"),
               safe_numeric("Original Pirce"), 0)                           AS value
    FROM po_data
    WHERE (p_project IS NULL OR TRIM("Project") = p_project)
      AND (p_supplier IS NULL OR TRIM("Supplier") = p_supplier)
    ORDER BY value DESC
    LIMIT 15
  )
  SELECT json_agg(json_build_object('pr', pr, 'project', project, 'supplier', supplier, 'material', material, 'qty', 0, 'value', value))
  INTO v_recent_activity FROM base;

  -- Distinct project list (for filter dropdown)
  SELECT json_agg(DISTINCT "Project" ORDER BY "Project")
  INTO v_project_list
  FROM po_data
  WHERE "Project" IS NOT NULL AND TRIM("Project") != '';

  -- Distinct supplier list (for filter dropdown)
  SELECT json_agg(DISTINCT "Supplier" ORDER BY "Supplier")
  INTO v_supplier_list
  FROM po_data
  WHERE "Supplier" IS NOT NULL AND TRIM("Supplier") != '';

  RETURN json_build_object(
    'total_spend',       COALESCE(v_total_spend, 0),
    'active_prs',        COALESCE(v_active_prs, 0),
    'active_projects',   COALESCE(v_active_projects, 0),
    'active_suppliers',  COALESCE(v_active_suppliers, 0),
    'avg_po_value',      COALESCE(v_avg_po_value, 0),
    'top_projects',      COALESCE(v_top_projects, '[]'::json),
    'top_suppliers',     COALESCE(v_top_suppliers, '[]'::json),
    'recent_activity',   COALESCE(v_recent_activity, '[]'::json),
    'project_list',      COALESCE(v_project_list, '[]'::json),
    'supplier_list',     COALESCE(v_supplier_list, '[]'::json)
  );
END;
$$;

-- Allow anon role to execute the function (RLS bypass via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION get_po_analytics TO anon, public;
