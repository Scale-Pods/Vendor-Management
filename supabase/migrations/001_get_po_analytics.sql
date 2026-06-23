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
  v_j jsonb;
  v_total_spend      numeric := 0;
  v_active_prs       integer := 0;
  v_active_projects  integer := 0;
  v_active_suppliers integer := 0;
  v_pending_items    integer := 0;
  v_avg_po_value     numeric := 0;
  v_top_projects     json := '[]'::json;
  v_top_suppliers    json := '[]'::json;
  v_recent_activity  json := '[]'::json;
  v_project_list     json := '[]'::json;
  v_supplier_list    json := '[]'::json;
BEGIN
  WITH base AS (
    SELECT
      to_jsonb(po_data) AS j
    FROM po_data
    WHERE (p_project IS NULL OR TRIM("Project") = p_project)
      AND (p_supplier IS NULL OR TRIM("Supplier") = p_supplier)
  )
  SELECT
    COALESCE(SUM(safe_numeric(b.j->>'Total Price')), 0),
    COUNT(DISTINCT COALESCE(NULLIF(TRIM(b.j->>'Req Ref'), ''), NULLIF(TRIM(b.j->>'Ref'), ''), 'N/A')),
    COUNT(DISTINCT COALESCE(NULLIF(TRIM(b.j->>'Project'), ''), 'Unknown')),
    COUNT(DISTINCT COALESCE(NULLIF(TRIM(b.j->>'Supplier'), ''), 'Unknown')),
    CASE WHEN COUNT(DISTINCT COALESCE(NULLIF(TRIM(b.j->>'Req Ref'), ''), NULLIF(TRIM(b.j->>'Ref'), ''), 'N/A')) > 0
         THEN SUM(safe_numeric(b.j->>'Total Price')) / COUNT(DISTINCT COALESCE(NULLIF(TRIM(b.j->>'Req Ref'), ''), NULLIF(TRIM(b.j->>'Ref'), ''), 'N/A'))
         ELSE 0 END,
    COUNT(*) FILTER (WHERE
      COALESCE(b.j->>'Status', b.j->>'Approve / Reject', '') ILIKE '%Pending%')
  INTO v_total_spend, v_active_prs, v_active_projects,
       v_active_suppliers, v_avg_po_value, v_pending_items
  FROM base;

  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM(b.j->>'Project'), ''), 'Unknown') AS project_name,
      safe_numeric(b.j->>'Total Price') AS total_price
    FROM (SELECT to_jsonb(po_data) AS j FROM po_data
      WHERE (p_project IS NULL OR TRIM("Project") = p_project)
        AND (p_supplier IS NULL OR TRIM("Supplier") = p_supplier)) b
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

  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM(b.j->>'Supplier'), ''), 'Unknown') AS supplier_name,
      COALESCE(NULLIF(TRIM(b.j->>'Project'), ''), 'Unknown') AS project_name,
      safe_numeric(b.j->>'Total Price') AS total_price
    FROM (SELECT to_jsonb(po_data) AS j FROM po_data
      WHERE (p_project IS NULL OR TRIM("Project") = p_project)
        AND (p_supplier IS NULL OR TRIM("Supplier") = p_supplier)) b
  ),
  agg AS (
    SELECT
      supplier_name AS name,
      SUM(total_price) AS spend,
      COUNT(*) AS orders,
      COUNT(DISTINCT project_name) AS projects,
      ROUND(SUM(total_price) * 100.0 / NULLIF(SUM(SUM(total_price)) OVER (), 0), 1) AS share
    FROM base
    GROUP BY supplier_name
    ORDER BY spend DESC
    LIMIT 10
  )
  SELECT json_agg(json_build_object('name', name, 'spend', spend, 'orders', orders, 'projects', projects, 'share', share))
  INTO v_top_suppliers FROM agg;

  WITH base AS (
    SELECT
      COALESCE(NULLIF(TRIM(b.j->>'Req Ref'), ''), NULLIF(TRIM(b.j->>'Ref'), ''), 'N/A') AS pr,
      COALESCE(NULLIF(TRIM(b.j->>'Project'), ''), '—') AS project,
      COALESCE(NULLIF(TRIM(b.j->>'Supplier'), ''), '—') AS supplier,
      COALESCE(NULLIF(TRIM(b.j->>'Description'), ''), NULLIF(TRIM(b.j->>'Ref'), ''), '—') AS material,
      safe_numeric(b.j->>'Total Price') AS value
    FROM (SELECT to_jsonb(po_data) AS j FROM po_data
      WHERE (p_project IS NULL OR TRIM("Project") = p_project)
        AND (p_supplier IS NULL OR TRIM("Supplier") = p_supplier)) b
    ORDER BY value DESC
    LIMIT 15
  )
  SELECT json_agg(json_build_object('pr', pr, 'project', project, 'supplier', supplier, 'material', material, 'value', value))
  INTO v_recent_activity FROM base;

  SELECT json_agg(DISTINCT j->>'Project' ORDER BY j->>'Project')
  INTO v_project_list
  FROM (SELECT to_jsonb(po_data) AS j FROM po_data) sub
  WHERE j->>'Project' IS NOT NULL AND TRIM(j->>'Project') != '';

  SELECT json_agg(DISTINCT j->>'Supplier' ORDER BY j->>'Supplier')
  INTO v_supplier_list
  FROM (SELECT to_jsonb(po_data) AS j FROM po_data) sub
  WHERE j->>'Supplier' IS NOT NULL AND TRIM(j->>'Supplier') != '';

  RETURN json_build_object(
    'total_spend',       v_total_spend,
    'active_prs',        v_active_prs,
    'active_projects',   v_active_projects,
    'active_suppliers',  v_active_suppliers,
    'pending_items',     v_pending_items,
    'avg_po_value',      v_avg_po_value,
    'top_projects',      v_top_projects,
    'top_suppliers',     v_top_suppliers,
    'recent_activity',   v_recent_activity,
    'project_list',      v_project_list,
    'supplier_list',     v_supplier_list
  );
END;
$$;

-- Allow anon role to execute the function (RLS bypass via SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION get_po_analytics TO anon, public;
