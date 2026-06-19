-- Run this in Supabase SQL Editor
DROP FUNCTION IF EXISTS get_pr_list;
DROP FUNCTION IF EXISTS get_pr_detail;

-- SETOF makes PostgREST expose this properly
CREATE OR REPLACE FUNCTION get_pr_list()
RETURNS SETOF po_data
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY SELECT * FROM po_data;
END;
$$;

GRANT EXECUTE ON FUNCTION get_pr_list TO anon, public;

CREATE OR REPLACE FUNCTION get_pr_detail(p_pr text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  material_items json;
  pr_data_rows   json;
  po_rows        json;
  project_name   text;
BEGIN
  SELECT COALESCE(NULLIF(TRIM("Project"), ''), 'Unknown')
  INTO project_name
  FROM po_data
  WHERE "Req Ref" = p_pr OR "Ref" = p_pr
  LIMIT 1;

  SELECT COALESCE(json_agg(item), '[]'::json) INTO material_items
  FROM (
    SELECT * FROM material_detail_25 WHERE "PR" = p_pr
    UNION ALL
    SELECT * FROM material_detail_26 WHERE "PR" = p_pr
  ) item;

  SELECT COALESCE(json_agg(item), '[]'::json) INTO pr_data_rows
  FROM (
    SELECT * FROM pr_data_25 WHERE "PR" = p_pr
    UNION ALL
    SELECT * FROM pr_data_26 WHERE "PR" = p_pr
  ) item;

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
