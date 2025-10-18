-- Rename source "Other" to "Customer Referral" for better clarity
-- This update maintains referential integrity and updates the display name only

UPDATE sources 
SET name = 'Customer Referral'
WHERE name = 'Other';
