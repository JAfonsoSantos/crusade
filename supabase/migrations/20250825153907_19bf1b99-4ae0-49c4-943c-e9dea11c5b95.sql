-- Temporarily disable the trigger to allow admin promotion
DROP TRIGGER IF EXISTS prevent_role_escalation_trigger ON profiles;

-- Promote Afonso Santos to admin role
UPDATE profiles 
SET role = 'admin' 
WHERE full_name = 'Afonso Santos' 
  AND user_id = '7cc00bf1-efbc-4e84-9e49-bf04b45d021f';

-- Re-enable the trigger
CREATE TRIGGER prevent_role_escalation_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();