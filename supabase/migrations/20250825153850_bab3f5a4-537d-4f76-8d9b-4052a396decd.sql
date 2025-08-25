-- Promote Afonso Santos to admin role
UPDATE profiles 
SET role = 'admin' 
WHERE full_name = 'Afonso Santos' 
  AND user_id = '7cc00bf1-efbc-4e84-9e49-bf04b45d021f';