-- Email Updates Configuration Seed Data
-- Extends coaching_framework_config with email-specific settings

-- ============================================================================
-- VC TARGETS CONFIGURATION
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'email_vc_targets',
  '{
    "GA": 76,
    "AL": 69,
    "focus_state": "GA",
    "description": "Monthly Virtual Championship (VC) item targets by state"
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- CSR TIER CONFIGURATION
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'email_csr_tiers',
  '{
    "description": "CSR bonus tiers based on monthly referral/cross-sell items",
    "tiers": [
      {
        "name": "Top",
        "bonus": 2000,
        "requirements": {
          "alr": 5,
          "referrals": 5,
          "cross_sell_quotes": 25,
          "reviews": 5
        }
      },
      {
        "name": "Mid",
        "bonus": 1250,
        "requirements": {
          "alr": 3,
          "referrals": 3,
          "cross_sell_quotes": 15,
          "reviews": 3
        }
      },
      {
        "name": "Bottom",
        "bonus": 750,
        "requirements": {
          "alr": 2,
          "referrals": 2,
          "cross_sell_quotes": 10,
          "reviews": 2
        }
      }
    ]
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- SOURCE NAME MAPPINGS
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'email_source_mappings',
  '{
    "description": "Maps AgencyZoom source names to display names with CSR attribution",
    "mappings": [
      {
        "raw_names": ["Crystal", "Crystal Brozio"],
        "display_name": "Crystal (CSR)",
        "is_csr": true,
        "attributed_to": "Crystal"
      },
      {
        "raw_names": ["Aleeah", "Aleeah Stone"],
        "display_name": "Aleeah (CSR)",
        "is_csr": true,
        "attributed_to": "Aleeah"
      },
      {
        "raw_names": ["Kathy", "Kathy Service"],
        "display_name": "Kathy (CSR)",
        "is_csr": true,
        "attributed_to": "Kathy"
      },
      {
        "raw_names": ["Net Leads", "Net Lead"],
        "display_name": "Net Leads",
        "is_csr": false
      },
      {
        "raw_names": ["Referral", "Referrals"],
        "display_name": "Referrals",
        "is_csr": false
      },
      {
        "raw_names": ["Call-In", "Call In", "Inbound Call"],
        "display_name": "Call-In",
        "is_csr": false
      },
      {
        "raw_names": ["Cross-Sell", "Cross Sell", "XSell"],
        "display_name": "Cross-Sell",
        "is_csr": false
      },
      {
        "raw_names": ["Digital Marketing", "Digital", "DM"],
        "display_name": "Digital Marketing",
        "is_csr": false
      },
      {
        "raw_names": ["Direct Mail"],
        "display_name": "Direct Mail",
        "is_csr": false
      },
      {
        "raw_names": ["Walk-In", "Walk In"],
        "display_name": "Walk-In",
        "is_csr": false
      }
    ]
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- EMAIL TEMPLATE SETTINGS
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'email_template_settings',
  '{
    "description": "Settings for weekly/monthly email generation",
    "weekly": {
      "sections": [
        "opening_hook",
        "production_table",
        "vc_pacing",
        "quotes_close_rate",
        "lead_source_performance",
        "coaching_notes",
        "csr_section",
        "announcements",
        "week_focus",
        "closing"
      ],
      "emojis": {
        "up": "🔺",
        "down": "🔻",
        "warning": "⚠️",
        "success": "✅",
        "fire": "🔥"
      },
      "table_style": {
        "header_bg": "#1e40af",
        "header_text": "#ffffff",
        "row_alt_bg": "#f3f4f6",
        "border_color": "#e5e7eb"
      }
    },
    "monthly": {
      "sections": [
        "opening_hook",
        "monthly_summary",
        "vc_final_status",
        "producer_rankings",
        "lead_source_analysis",
        "csr_bonus_status",
        "month_highlights",
        "next_month_focus",
        "closing"
      ]
    },
    "signature": "Cody",
    "closing_phrase": "LFG."
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE public.coaching_framework_config IS 'Stores configuration for coaching and email features. config_type identifies the configuration purpose.';
