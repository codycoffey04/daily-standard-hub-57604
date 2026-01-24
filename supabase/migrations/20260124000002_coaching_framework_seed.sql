-- =============================================
-- Sales Coaching Feature - Framework Seed Data
-- =============================================

-- 1. Scorecard Criteria (config_type = 'scorecard')
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'scorecard',
  '{
    "steps": [
      {
        "step": 1,
        "name": "opening",
        "label": "Opening",
        "criteria": {
          "0_missed": "Jumped straight to quoting without greeting or rapport",
          "1_partial": "Greeted but no rapport question or stated purpose unclear",
          "2_strong": "Greeted by name, stated name/agency, stated purpose, asked rapport question"
        },
        "look_for": ["greeting by name", "stated purpose", "rapport question", "how are you"]
      },
      {
        "step": 2,
        "name": "discovery",
        "label": "Discovery / Engaging",
        "criteria": {
          "0_missed": "Only gathered quoting info, no discovery",
          "1_partial": "Asked basic info but no pain points or motivation questions",
          "2_strong": "Asked about current coverage, pain points, life changes, why shopping"
        },
        "look_for": ["why are you shopping", "current coverage", "any issues", "what''s prompting", "life changes"]
      },
      {
        "step": 3,
        "name": "quoting",
        "label": "Quoting / Presenting",
        "criteria": {
          "0_missed": "Led with price only, no coverage explanation, no bundling mention",
          "1_partial": "Mentioned price with some coverage context OR mentioned bundling but didn''t explain value",
          "2_strong": "Explained coverage before price, mentioned bundling/multi-policy discount, presented value"
        },
        "look_for": ["coverage", "liability", "deductible", "multi-policy", "bundle", "discount"]
      },
      {
        "step": 4,
        "name": "ask_for_sale",
        "label": "Ask for the Sale",
        "criteria": {
          "0_missed": "No close attempt, ended with ''call me if you decide''",
          "1_partial": "Soft close (''what do you think?'') or handled objection but didn''t re-ask",
          "2_strong": "Direct closing question, handled objections effectively"
        },
        "look_for": ["ready to get started", "would you like to", "let''s get you set up", "move forward"]
      },
      {
        "step": 5,
        "name": "closing",
        "label": "Closing the Call",
        "criteria": {
          "0_missed": "Abrupt ending, no next steps, no thank you",
          "1_partial": "Ended professionally but next steps unclear",
          "2_strong": "Thanked customer, confirmed clear next steps, professional wrap-up"
        },
        "look_for": ["thank you", "next steps", "follow up", "I''ll email", "I''ll call"]
      },
      {
        "step": 6,
        "name": "follow_up",
        "label": "Follow-up / X-Date",
        "criteria": {
          "0_missed": "No follow-up set for unsold quote",
          "1_partial": "Vague follow-up (''I''ll check back'')",
          "2_strong": "Set specific follow-up date, mentioned X-date (45 days before renewal)"
        },
        "look_for": ["follow up", "call you back", "X-date", "renewal", "45 days", "reminder"],
        "na_condition": "Call resulted in a sale"
      },
      {
        "step": 7,
        "name": "multi_line",
        "label": "Multi-Line Focus / Cross-Sell",
        "criteria": {
          "0_missed": "Customer mentioned cross-sell trigger and agent didn''t pursue, OR no mention of other products",
          "1_partial": "Mentioned another product but didn''t pursue or quote",
          "2_strong": "Asked about other insurance needs, responded to cross-sell triggers, quoted multi-line"
        },
        "look_for": ["home", "auto", "renter", "umbrella", "life", "boat", "motorcycle", "do you have"]
      },
      {
        "step": 8,
        "name": "referral_ask",
        "label": "Referral Ask",
        "criteria": {
          "0_missed": "No referral ask",
          "1_partial": "Weak or buried ask (''feel free to share my info'')",
          "2_strong": "Direct referral ask after positive interaction"
        },
        "look_for": ["referral", "anyone else", "friends", "family", "coworkers", "send them my way"]
      }
    ]
  }'::jsonb,
  true,
  1
);

-- 2. Cross-Sell Triggers (config_type = 'cross_sell_triggers')
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'cross_sell_triggers',
  '{
    "categories": [
      {
        "name": "vehicle_powersports",
        "triggers": [
          {"keyword": "boat", "product": "Boat/Watercraft policy"},
          {"keyword": "jet ski", "product": "Watercraft policy"},
          {"keyword": "motorcycle", "product": "Motorcycle policy"},
          {"keyword": "atv", "product": "ATV/Off-road policy"},
          {"keyword": "utv", "product": "UTV policy"},
          {"keyword": "golf cart", "product": "Golf cart policy"},
          {"keyword": "camper", "product": "RV/Camper policy"},
          {"keyword": "rv", "product": "RV policy"},
          {"keyword": "motorhome", "product": "RV policy"},
          {"keyword": "new car", "product": "Auto policy"},
          {"keyword": "teen driver", "product": "Add driver + umbrella"},
          {"keyword": "student driver", "product": "Add driver + student discount"}
        ]
      },
      {
        "name": "home_property",
        "triggers": [
          {"keyword": "new house", "product": "Home policy"},
          {"keyword": "buying a house", "product": "Home policy"},
          {"keyword": "just moved", "product": "Home/Renter''s policy"},
          {"keyword": "renting", "product": "Renter''s policy"},
          {"keyword": "apartment", "product": "Renter''s policy"},
          {"keyword": "landlord", "product": "Landlord policy"},
          {"keyword": "rental property", "product": "Landlord policy"},
          {"keyword": "condo", "product": "Condo policy"},
          {"keyword": "lake house", "product": "Secondary home policy"},
          {"keyword": "vacation home", "product": "Secondary home policy"},
          {"keyword": "dock", "product": "Watercraft opportunity"},
          {"keyword": "pool", "product": "Umbrella discussion"},
          {"keyword": "on stilts", "product": "Specialty dwelling"}
        ]
      },
      {
        "name": "life_events",
        "triggers": [
          {"keyword": "married", "product": "Bundle + life insurance"},
          {"keyword": "baby", "product": "Life insurance"},
          {"keyword": "pregnant", "product": "Life insurance"},
          {"keyword": "retired", "product": "Coverage review"}
        ]
      },
      {
        "name": "coverage_gaps",
        "triggers": [
          {"keyword": "umbrella", "product": "Umbrella liability"},
          {"keyword": "life insurance", "product": "Life policy"},
          {"keyword": "lapsed", "product": "Urgency - coverage gap"},
          {"keyword": "canceled", "product": "Re-quote opportunity"}
        ]
      }
    ]
  }'::jsonb,
  true,
  1
);

-- 3. Focus Rotation (config_type = 'focus_rotation')
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'focus_rotation',
  '{
    "cycle_start_date": "2026-01-06",
    "weeks": [
      {
        "week": 1,
        "theme": "Discovery & Needs Assessment",
        "primary_step": "step_2_discovery",
        "focus_question": "Why are you shopping for insurance today?",
        "challenge": "Ask ''What''s prompting you to look at insurance today?'' on every quote call"
      },
      {
        "week": 2,
        "theme": "Bundling & Multi-Line",
        "primary_step": "step_7_multi_line",
        "focus_question": "Do you have your home/auto with us too?",
        "challenge": "Quote at least one multi-line package per day"
      },
      {
        "week": 3,
        "theme": "Asking for the Sale",
        "primary_step": "step_4_ask_for_sale",
        "focus_question": "Are you ready to get started today?",
        "challenge": "Use a direct close on every quoted call"
      },
      {
        "week": 4,
        "theme": "Referral Generation",
        "primary_step": "step_8_referral_ask",
        "focus_question": "Do you know anyone else who might benefit from a second look at their insurance?",
        "challenge": "Get 2 referrals this week"
      },
      {
        "week": 5,
        "theme": "Objection Handling",
        "primary_step": "step_4_ask_for_sale",
        "focus_question": "What''s your main concern?",
        "challenge": "When you hear an objection, pause, acknowledge it, then address it directly"
      },
      {
        "week": 6,
        "theme": "Quote Volume & Activity",
        "primary_step": "step_2_discovery",
        "focus_question": "How many quotes did I do today?",
        "challenge": "Hit 50+ quotes this week (10/day)"
      },
      {
        "week": 7,
        "theme": "Cross-Sell Triggers",
        "primary_step": "step_7_multi_line",
        "focus_question": "What else does this customer need?",
        "challenge": "Pursue every cross-sell trigger you hear this week"
      },
      {
        "week": 8,
        "theme": "Value Before Price",
        "primary_step": "step_3_quoting",
        "focus_question": "What coverage are they getting for that premium?",
        "challenge": "On every quote, explain at least 3 coverage elements before saying the premium"
      }
    ],
    "override_rules": [
      "Override if producer has critical gap showing up repeatedly (e.g., 0 referral asks for 2+ weeks)",
      "Override for significant agency events (new product launch, end of month push)",
      "Never repeat same theme two weeks in a row"
    ]
  }'::jsonb,
  true,
  1
);

-- 4. Episode Template (config_type = 'episode_template')
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'episode_template',
  '{
    "target_length_words": {"min": 1200, "max": 1400},
    "target_audio_minutes": {"min": 8, "max": 12},
    "positive_to_corrective_ratio": "2:1",
    "sections": [
      {
        "name": "welcome",
        "description": "Greeting and overview",
        "target_sentences": 2
      },
      {
        "name": "your_numbers",
        "description": "Metrics summary from AgencyZoom",
        "include": ["quotes", "sales", "close_rate", "items", "premium"],
        "context": ["comparison to target", "team average", "monthly pacing"]
      },
      {
        "name": "what_you_did_well",
        "description": "Minimum 2 specific wins with transcript quotes",
        "percentage_of_content": 40,
        "requirements": ["specific transcript quote", "why it matters", "encouragement to continue"]
      },
      {
        "name": "growth_opportunity",
        "description": "ONE specific area to improve",
        "percentage_of_content": 30,
        "requirements": ["specific example from transcript", "what to say instead", "tie to results"],
        "rules": ["Only one growth area per episode", "Tie to weekly focus when possible"]
      },
      {
        "name": "this_weeks_focus",
        "description": "From focus rotation",
        "include": ["theme name", "one clear behavior", "exact language to use"]
      },
      {
        "name": "challenge",
        "description": "Specific measurable goal",
        "requirements": ["specific number", "achievable", "tied to commission/goals"]
      },
      {
        "name": "closing",
        "description": "Quick recap and encouragement",
        "target_sentences": 3
      }
    ],
    "tone_guidelines": {
      "do": [
        "Sound like a coach talking to a player",
        "Use ''you'' and ''your''",
        "Be specific with names, quotes, situations",
        "Be encouraging but honest",
        "Use conversational language"
      ],
      "dont": [
        "Sound corporate or formal",
        "Be vague",
        "Pile on criticism - stick to ONE growth area",
        "Use jargon",
        "Hedge or soften too much"
      ]
    },
    "notebooklm_settings": {
      "format": "Deep Dive",
      "length": "Long",
      "focus_prompt_template": "This is a personalized weekly sales coaching session for an insurance producer named {producer_name}. The hosts should sound like supportive but direct sales coaches — encouraging but not soft. Focus on the specific call examples. Make it feel like a real coaching conversation, not a corporate training video. Keep the energy up."
    }
  }'::jsonb,
  true,
  1
);

-- 5. Producer Profiles (config_type = 'producer_profiles')
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'producer_profiles',
  '{
    "producers": [
      {
        "name": "Maria Rocha-Guzman",
        "display_name": "Maria",
        "location": "Georgia",
        "monthly_target_items": 76,
        "strengths": ["Product knowledge", "Bundling discipline", "Handles complex situations"],
        "growth_areas": ["Referral asks", "Cross-sell depth"],
        "notes": "Bilingual (English/Spanish)"
      },
      {
        "name": "Kimberly Fletcher",
        "display_name": "Kimberly",
        "location": "Georgia",
        "monthly_target_items": 76,
        "strengths": ["Explaining value", "Honest with customers", "Good follow-ups"],
        "growth_areas": ["Referral asks", "Discovery questions"],
        "notes": "Office Manager + Senior Sales Producer"
      }
    ]
  }'::jsonb,
  true,
  1
);
