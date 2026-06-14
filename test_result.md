#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  1. AI assistant replies contain Markdown filler characters (#, *, $, backticks). Make replies clean plain text.
  2. Add staff login via phone + OTP (primary for both customer & staff). Grant access to phone 9028597888.
  3. Fix AI chat: when keyboard opens the input bar is hidden and the chat does not scroll.
  4. Add a 3rd customer option: Guest login (no phone/OTP). Service request & complaint features stay for onboarded clients only.
  5. Add "Start Your Project" on the customer side → payment gateway to pay 10% of the total project cost.
  6. Populate all features with relevant info; remove dead hyperlinks.

backend:
  - task: "Strip Markdown from AI replies (clean_reply) + plain-text system prompt"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Added clean_reply() that removes #, *, $, backticks, blockquotes, HR, converts bullets to •, and turns markdown links into 'label (url)'. Applied to /ai/chat reply. System prompt now forbids Markdown and asks for ₹."
  - task: "Phone+OTP staff login + provision staff phone 9028597888"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "otp/verify already resolves users by role. Added idempotent ensure_core_accounts() on startup that upserts 9028597888 as an admin staff account (and promotes a pre-existing customer/guest record if present)."
  - task: "Guest login endpoint"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "POST /auth/guest creates a role=customer, is_guest=true user and returns a token. public_user now exposes is_guest."
  - task: "Booking payment (10%) endpoints"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "POST /payments computes 10% booking server-side, stores a PSP-shaped record (receipt_no, amount, status=paid, gateway=mock) and returns it. GET /payments lists per-user. Mock gateway, swappable for Razorpay/Stripe."

frontend:
  - task: "AI chat keyboard handling + scroll"
    implemented: true
    working: "NA"
    file: "frontend/app/(customer)/assistant.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Replaced ineffective KeyboardAvoidingView with manual Keyboard listeners; lift container by (keyboardHeight - tabBarHeight) so input bar sits above the keypad and the conversation stays scrollable; auto scroll-to-end on show/focus/new message."
  - task: "Login: OTP-primary staff (email fallback) + Guest button"
    implemented: true
    working: "NA"
    file: "frontend/app/login.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Staff tab now uses phone+OTP by default with a 'sign in with email' fallback link. Customer tab adds 'Continue as Guest'. auth.tsx adds guestLogin() and is_guest on User."
  - task: "Guest gating of service/complaints"
    implemented: true
    working: "NA"
    file: "frontend/app/(customer)/_layout.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Support (tickets) tab hidden (href:null) for guests. Profile shows a guest banner prompting phone sign-in to unlock service requests."
  - task: "Start Your Project payment flow"
    implemented: true
    working: "NA"
    file: "frontend/app/(customer)/start-project.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "New screen: pick package / enter total → review 10% booking → mock card checkout → processing → success receipt (POST /payments). Linked from a 'Start Your Project' card on the customer home and registered as a non-tab route."
  - task: "Remove dead links / populate info (Profile)"
    implemented: true
    working: "NA"
    file: "frontend/src/screens/Profile.tsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
        -working: "NA"
        -agent: "main"
        -comment: "Profile rows now open real info sheets (Account & security, Notifications & preferences, Help & support) with working website/email links, AI-assistant and service-request shortcuts; added 'Visit our website'. Role-aware for guest/staff/customer."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Phone+OTP staff login + provision staff phone 9028597888"
    - "Guest login endpoint"
    - "Booking payment (10%) endpoints"
    - "Strip Markdown from AI replies (clean_reply) + plain-text system prompt"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    -agent: "main"
    -message: "Implemented tasks 1-6. Backend py_compile passes; frontend tsc shows only the repo's pre-existing 'testID not in props' warnings and eslint is clean on changed files. Please retest: OTP login for 9028597888 (should land on staff dashboard), /auth/guest access, /payments 10% calc, and that AI replies have no #/*/$ filler."