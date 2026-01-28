-- =============================================
-- CSR Coaching Framework - Seed Data
-- Adds csr_* config types to coaching_framework_config
-- =============================================

-- ============================================================================
-- 1. Update config_type CHECK constraint to allow CSR types
-- ============================================================================
ALTER TABLE public.coaching_framework_config DROP CONSTRAINT IF EXISTS coaching_framework_config_config_type_check;
ALTER TABLE public.coaching_framework_config ADD CONSTRAINT coaching_framework_config_config_type_check
  CHECK (config_type IN (
    'scorecard', 'cross_sell_triggers', 'focus_rotation', 'episode_template', 'producer_profiles',
    'csr_scorecard', 'csr_cross_sell_triggers', 'csr_focus_rotation', 'csr_episode_template', 'csr_profiles'
  ));

-- ============================================================================
-- 2. CSR Scorecard (7 steps)
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'csr_scorecard',
  '{
    "steps": [
      {
        "step": 1,
        "name": "greeting",
        "label": "Greeting & Tone",
        "criteria": {
          "0_missed": "No greeting, jumped straight to business, sounded annoyed or rushed",
          "1_partial": "Greeted but didn''t state name or agency, or tone was flat/disengaged",
          "2_strong": "Stated name and agency, warm professional tone, made the customer feel welcome"
        },
        "look_for": ["Thank you for calling", "Coffey Agencies", "this is", "How can I help"]
      },
      {
        "step": 2,
        "name": "listening_empathy",
        "label": "Active Listening & Empathy",
        "criteria": {
          "0_missed": "Interrupted customer, dismissed concern, no acknowledgment of frustration",
          "1_partial": "Let customer speak but generic responses (okay, uh huh), no empathy language",
          "2_strong": "Actively listened, used empathy language, acknowledged situation before solving"
        },
        "look_for": ["I understand", "I can see why", "Let me make sure I have this right", "that''s frustrating"]
      },
      {
        "step": 3,
        "name": "problem_id",
        "label": "Problem Identification",
        "criteria": {
          "0_missed": "Assumed the issue without asking, started working on wrong problem",
          "1_partial": "Got basic issue but missed details, didn''t confirm understanding",
          "2_strong": "Asked clarifying questions, confirmed understanding, identified real issue"
        },
        "look_for": ["So what you''re saying is", "Is there anything else", "clarifying questions", "confirm back"]
      },
      {
        "step": 4,
        "name": "resolution",
        "label": "Resolution & Follow-Through",
        "criteria": {
          "0_missed": "Left unresolved, no next steps, customer had to ask what now",
          "1_partial": "Resolved but didn''t explain next steps, or vague follow-up",
          "2_strong": "Resolved with clear next steps and timeline, confirmed satisfaction"
        },
        "look_for": ["Here''s what I''ve done", "What you''ll see next", "I''ll have this updated by", "anything else"]
      },
      {
        "step": 5,
        "name": "cross_sell",
        "label": "Cross-Sell Opportunity",
        "criteria": {
          "0_missed": "Customer mentioned trigger (new car, baby, moving) and CSR ignored it",
          "1_partial": "Noticed opportunity but only passing mention, didn''t offer to connect",
          "2_strong": "Identified opportunity, explained relevance, offered to transfer to producer"
        },
        "look_for": ["have you thought about", "can have an agent call", "bundling", "life insurance"]
      },
      {
        "step": 6,
        "name": "referral_ask",
        "label": "Referral Ask",
        "criteria": {
          "0_missed": "No referral ask at all",
          "1_partial": "Weak or buried ask (feel free to tell your friends)",
          "2_strong": "Direct natural referral ask after positive resolution"
        },
        "look_for": ["know anyone", "friends or family", "referral", "send them our way"],
        "na_condition": "Call ended with unresolved issue or upset customer"
      },
      {
        "step": 7,
        "name": "retention",
        "label": "Retention Language",
        "conditional": true,
        "condition": "Customer mentions cancelling, switching, leaving, or being unhappy",
        "criteria": {
          "0_missed": "Immediately processed cancellation without asking why",
          "1_partial": "Asked why but accepted first answer without exploring solutions",
          "2_strong": "Asked why, acknowledged concern, explored alternatives, only cancelled after exhausting options"
        },
        "look_for": ["what''s prompting", "before we process that", "loyalty discount", "continuous coverage"]
      }
    ]
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- 3. CSR Cross-Sell Triggers
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'csr_cross_sell_triggers',
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
          {"keyword": "new car", "product": "Auto policy"},
          {"keyword": "teen driver", "product": "Add driver + umbrella"},
          {"keyword": "adding a driver", "product": "Teen driver + umbrella review"}
        ]
      },
      {
        "name": "home_property",
        "triggers": [
          {"keyword": "new house", "product": "Home policy"},
          {"keyword": "buying a house", "product": "Home policy"},
          {"keyword": "moving", "product": "Home/Renter''s policy"},
          {"keyword": "new address", "product": "Home/Renter''s policy"},
          {"keyword": "renting", "product": "Renter''s policy"},
          {"keyword": "apartment", "product": "Renter''s policy"}
        ]
      },
      {
        "name": "life_events",
        "triggers": [
          {"keyword": "married", "product": "Bundle + life insurance"},
          {"keyword": "baby", "product": "Life insurance"},
          {"keyword": "pregnant", "product": "Life insurance"},
          {"keyword": "retired", "product": "Coverage review"},
          {"keyword": "just retired", "product": "Full coverage review"}
        ]
      },
      {
        "name": "service_specific",
        "triggers": [
          {"keyword": "filing a claim", "product": "Coverage adequacy review"},
          {"keyword": "too expensive", "product": "Bundle review opportunity"},
          {"keyword": "can''t afford", "product": "Bundle review opportunity"}
        ]
      },
      {
        "name": "life_insurance_aleeah",
        "description": "Special triggers for Aleeah life insurance tracking",
        "triggers": [
          {"keyword": "baby", "product": "Life insurance"},
          {"keyword": "pregnant", "product": "Life insurance"},
          {"keyword": "marriage", "product": "Life insurance"},
          {"keyword": "engaged", "product": "Life insurance"},
          {"keyword": "mortgage", "product": "Life insurance"},
          {"keyword": "bought a house", "product": "Life insurance"},
          {"keyword": "retirement", "product": "Life insurance"},
          {"keyword": "health", "product": "Life insurance"},
          {"keyword": "hospital", "product": "Life insurance"},
          {"keyword": "beneficiary", "product": "Life insurance"}
        ]
      }
    ]
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- 4. CSR Focus Rotation (6 weeks)
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'csr_focus_rotation',
  '{
    "cycle_start_date": "2026-01-06",
    "cycle_length": 6,
    "weeks": [
      {
        "week": 1,
        "theme": "Empathy & Active Listening",
        "primary_step": "step_2_listening_empathy",
        "focus_question": "How did you make the customer feel heard?",
        "challenge": "Use at least one empathy phrase on every call (I understand, I can see why that''s frustrating)"
      },
      {
        "week": 2,
        "theme": "Referral Asks on Service Calls",
        "primary_step": "step_6_referral_ask",
        "focus_question": "Did you ask for a referral after resolving the issue?",
        "challenge": "Ask for a referral on at least 3 service calls this week"
      },
      {
        "week": 3,
        "theme": "Cross-Sell Opportunity Identification",
        "primary_step": "step_5_cross_sell",
        "focus_question": "What else does this customer need?",
        "challenge": "Identify and mention at least 1 cross-sell opportunity per day"
      },
      {
        "week": 4,
        "theme": "Retention & Save Language",
        "primary_step": "step_7_retention",
        "focus_question": "What did you say when the customer mentioned leaving?",
        "challenge": "Practice save scripts: ask why, acknowledge, offer solutions before accepting cancellation"
      },
      {
        "week": 5,
        "theme": "Google Review Asks",
        "primary_step": "google_review",
        "focus_question": "Did you ask for a review after a positive resolution?",
        "challenge": "Ask for a Google review after every positively resolved call this week"
      },
      {
        "week": 6,
        "theme": "Problem Resolution & Follow-Through",
        "primary_step": "step_4_resolution",
        "focus_question": "Did the customer know exactly what happens next?",
        "challenge": "End every call with a clear summary: what was done, what happens next, timeline"
      }
    ],
    "override_rules": [
      "Override if CSR has critical gap showing up repeatedly (e.g., 0 referral asks for 2+ weeks)",
      "Override for significant agency events (open enrollment, storm season claims surge)",
      "Never repeat same theme two weeks in a row",
      "If Aleeah misses life insurance opportunities for 2+ weeks, override her focus to cross-sell"
    ]
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- 5. CSR Episode Template
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'csr_episode_template',
  '{
    "target_length_words": {"min": 1000, "max": 1200},
    "target_audio_minutes": {"min": 7, "max": 10},
    "positive_to_corrective_ratio": "2:1",
    "sections": [
      {
        "name": "welcome",
        "description": "Greeting and overview",
        "target_sentences": 2
      },
      {
        "name": "your_week",
        "description": "Call volume, types, notable patterns",
        "target_sentences": 4,
        "include": ["calls_reviewed", "call_types", "patterns"]
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
        "requirements": ["specific example from transcript", "exact language to say instead", "tie to customer satisfaction or retention"],
        "rules": ["Only one growth area per episode", "Tie to weekly focus when possible"]
      },
      {
        "name": "this_weeks_focus",
        "description": "From 6-week focus rotation",
        "include": ["theme name", "one clear behavior", "exact language to use"]
      },
      {
        "name": "challenge",
        "description": "Specific measurable goal",
        "requirements": ["specific number or behavior", "achievable", "tied to customer experience"]
      },
      {
        "name": "closing",
        "description": "Quick recap and encouragement",
        "target_sentences": 3
      }
    ],
    "tone_guidelines": {
      "do": [
        "Sound like a supportive team lead talking to a valued team member",
        "Use you and your throughout",
        "Be specific with names, quotes, and situations from actual calls",
        "Acknowledge that service work is emotionally demanding",
        "Be encouraging but honest",
        "Use conversational language",
        "Frame retention value: when you handle that call well, that customer stays"
      ],
      "dont": [
        "Sound corporate or formal",
        "Be vague (you did great - at what?)",
        "Compare CSRs to each other",
        "Pile on criticism - stick to ONE growth area",
        "Use sales jargon (close rate, pipeline, conversion)",
        "Minimize the difficulty of calls they handled",
        "Hedge or soften too much"
      ]
    },
    "csr_specific_notes": {
      "crystal": "Slightly more direct - she is experienced and sets the standard. Reference her leadership role.",
      "kathy": "Focus on building confidence, especially around cross-sell and referral asks. Celebrate consistency.",
      "aleeah": "Balance service coaching with life insurance awareness. Don''t make life insurance feel like an add-on."
    },
    "notebooklm_settings": {
      "format": "Deep Dive",
      "length": "Long",
      "focus_prompt_template": "This is a personalized weekly coaching session for a customer service representative named {csr_name} at an insurance agency. The hosts should sound like supportive but direct team leads — encouraging but real. Focus on specific call examples and transcript quotes. Make it feel like a genuine coaching conversation about handling customers well, not a corporate training module. Keep the energy warm and appreciative. Acknowledge that service work is hard and that this person is valued."
    }
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- 6. CSR Profiles
-- ============================================================================
INSERT INTO public.coaching_framework_config (config_type, config_data, active, version)
VALUES (
  'csr_profiles',
  '{
    "csrs": [
      {
        "name": "Crystal Brozio",
        "display_name": "Crystal",
        "role": "Service Manager",
        "location": "Alabama (Centre)",
        "strengths": ["Process knowledge", "Customer retention", "Policy system expertise"],
        "growth_areas": ["Referral asks on service calls", "Google review asks after positive resolutions"],
        "coaching_notes": "As Service Manager, hold to higher standard on resolution quality and follow-through. She sets the example for Kathy and Aleeah.",
        "special_tracking": null
      },
      {
        "name": "Kathy Sewell",
        "display_name": "Kathy",
        "role": "CSR",
        "location": "Alabama (Centre)",
        "strengths": ["Consistent service delivery", "Reliable"],
        "growth_areas": ["Cross-sell identification", "Referral asks"],
        "coaching_notes": "Focus on building confidence to mention other products during natural conversation moments.",
        "special_tracking": null
      },
      {
        "name": "Aleeah Stone",
        "display_name": "Aleeah",
        "role": "CSR + Life Sales",
        "location": "Alabama (Centre)",
        "strengths": ["Service skills", "Willingness to learn life insurance"],
        "growth_areas": ["Recognizing life insurance opportunities in service calls", "Transitioning from service to life quote conversation"],
        "coaching_notes": "Unique dual role. Every service call is a potential life insurance lead. Listen for triggers: baby, marriage, mortgage, new home, retirement, health mention. Don''t force it — weave it naturally.",
        "special_tracking": {
          "life_insurance_tracking": true,
          "life_triggers": ["baby", "pregnant", "marriage", "engaged", "mortgage", "new home", "retirement", "health", "hospital", "beneficiary"]
        }
      }
    ]
  }'::jsonb,
  true,
  1
);

-- ============================================================================
-- 7. Update focus week function for dual cycle lengths
-- ============================================================================
CREATE OR REPLACE FUNCTION get_focus_week_number(
  target_date DATE,
  cycle_start_date DATE DEFAULT '2026-01-06'::DATE,
  cycle_length INTEGER DEFAULT 8
)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  weeks_since_start INTEGER;
BEGIN
  weeks_since_start := FLOOR((target_date - cycle_start_date) / 7);
  RETURN ((weeks_since_start % cycle_length) + 1);
END;
$$;
