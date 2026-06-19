-- =============================================================
-- Run this in your Supabase SQL Editor
-- 1. get_pr_list()         → all po_data rows (SECURITY DEFINER)
-- 2. get_pr_detail(p_pr)   → material_items, pr_data, purchase_orders
-- =============================================================

CREATE OR REPLACE FUNCTION get_pr_list()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  result json;
BEGIN
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json) INTO result
  FROM po_data t;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pr_list TO anon, public;

-- =============================================================

CREATE OR REPLACE FUNCTION get_pr_detail(p_pr text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  material_items json;
  pr_data_rows   json;
  po_rows        json;
  project_name   text;
BEGIN
  -- Get project name from po_data for context
  SELECT COALESCE(NULLIF(TRIM("Project"), ''), 'Unknown')
  INTO project_name
  FROM po_data
  WHERE "Req Ref" = p_pr OR "Ref" = p_pr
  LIMIT 1;

  -- Material detail rows (both tables)
  SELECT COALESCE(json_agg(item), '[]'::json) INTO material_items
  FROM (
    SELECT * FROM material_detail_25 WHERE "PR" = p_pr
    UNION ALL
    SELECT * FROM material_detail_26 WHERE "PR" = p_pr
  ) item;

  -- PR data rows (charges, discount info from both tables)
  SELECT COALESCE(json_agg(item), '[]'::json) INTO pr_data_rows
  FROM (
    SELECT * FROM pr_data_25 WHERE "PR" = p_pr
    UNION ALL
    SELECT * FROM pr_data_26 WHERE "PR" = p_pr
  ) item;

  -- Purchase orders linked to this PR
  SELECT COALESCE(json_agg(item), '[]'::json) INTO po_rows
  FROM purchase_orders WHERE "PR" = p_pr;

  RETURN json_build_object(
    'pr',              p_pr,
    'project',         COALESCE(project_name, 'Unknown'),
    'items',           material_items,
    'pr_data',         pr_data_rows,
    'purchase_orders', po_rows
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_pr_detail TO anon, public;
