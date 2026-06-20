# Learning Management System (LMS) - Project Architecture & Design Document

## 1. User Journey Flow

### 👤 Admin Journey
1.  **Login**: Admin logs in with secure credentials.
2.  **Dashboard**: Lands on a comprehensive dashboard with summary cards (Students, Teachers, Tests, etc.).
3.  **Management**:
    *   **Students**: Views list, filters by institute/course, adds new students, or views student profiles (performance, tests).
    *   **Teachers**: Views list, filters, adds new teachers, assigns courses, views teacher profiles.
    *   **Institutes**: Manages institutes (if multi-institute structure).
    *   **Courses**: Creates and manages courses and subjects.
4.  **Test Creation**:
    *   Selects attributes (Institute, Course, Subject).
    *   Enters Test Details (Title, Description with Rich Text).
    *   Adds Questions (MCQ, Subjective, True/False, File Upload).
    *   Configures Test Settings (Timer, Marks).
    *   Assigns Test (to Course/Batch/Students with dates).
5.  **Monitoring**: Views reports, pending evaluations, and system health.

### 👨‍🏫 Teacher Journey
1.  **Login**: Teacher logs in.
2.  **Dashboard**: Views assigned courses, pending evaluations, and quick stats.
3.  **Course Management**: Views details of assigned courses and enrolled students.
4.  **Test Management**:
    *   Views assigned tests.
    *   **Evaluation**: Opens a test submission, reads answers (text/file), assigns marks, adds remarks, and submits.
5.  **Analytics**: Checks student performance trends.

### 🎓 Student Journey
1.  **Login**: Student logs in.
2.  **Dashboard**: Sees enrolled courses, upcoming tests, and performance summary.
3.  **Test Taking**:
    *   Starts a test (Timer starts).
    *   Answers questions (Selects options, types answers, uploads files).
    *   Auto-saves progress.
    *   Submits test (or auto-submit on timeout).
4.  **Results**:
    *   Views score (immediate for objective, pending for subjective).
    *   Checks detailed report with teacher remarks.
    *   Downloads performance report.

---

## 2. Page-by-Page Wireframe Structure & Features

### 🟢 Admin Panel

#### 1. Admin Dashboard
*   **Header**: Logo, Search Bar, Notification Icon, Profile Dropdown.
*   **Summary Cards (Clickable)**:
    *   Total Students (Count + Trend)
    *   Total Teachers (Count)
    *   Total Tests (Active/Completed)
    *   Pending Evaluations (Count)
*   **Charts**: "Tests Conducted vs. Month" (Bar Chart), "Pass percentage" (Pie Chart).
*   **Recent Activity**: List of recently registered users or created tests.

#### 2. Student Management (`/admin/students`)
*   **Filters**: Dropdowns for Institute, Course, Batch. Search bar (Name/ID).
*   **Table**:
    *   Columns: Name, ID, Institute, Course, Email, Status (Active/Inactive Toggle), Actions (View, Edit, Delete).
    *   **Pagination**: Bottom right.
*   **Add Student Button**: Opens Modal/Page.

#### 3. Student Profile (`/admin/students/:id`)
*   **Header**: Student Photo, Name, ID, "Edit Profile" button.
*   **Tabs**:
    *   **Info**: Personal details, contact, enrollment info.
    *   **Performance**: Chart showing test scores over time.
    *   **Tests**: Table of attempted tests (Test Name, Date, Marks, Status).

#### 4. Teacher Management (`/admin/teachers`)
*   **Similar to Student Management**: List view with filters.
*   **Columns**: Name, ID, Subjects, Assigned Courses, Email, Actions.

#### 5. Teacher Profile (`/admin/teachers/:id`)
*   **Tabs**:
    *   **Info**: Details.
    *   **Workload**: Assigned Courses, Total Tests Assigned, Pending Evaluations.
    *   **History**: List of evaluations completed.

#### 6. Create Test (`/admin/tests/create`)
*   **Step 1: Basic Info**:
    *   Dropdowns: Institute, Course, Subject.
    *   Input: Test Name.
    *   Rich Text Editor: Description/Instructions.
*   **Step 2: Questions**:
    *   "Add Question" Button.
    *   Question Card:
        *   Text Editor for Question.
        *   Type Select: MCQ / Subjective / True-False / File Upload.
        *   Options (for MCQ) with "Correct Answer" radio button.
        *   Marks input.
*   **Step 3: Settings**:
    *   Duration (slider/input).
    *   Passing Marks.
    *   Shuffle Questions (Toggle).
*   **Step 4: Assignment**:
    *   Select Batch/Students.
    *   Start Date/Time & End Date/Time.

### 🟢 Teacher Panel

#### 1. Teacher Dashboard
*   **Cards**: Pending Evaluations, Assigned Courses, Total Students.
*   **Task List**: "Evaluate Test X - 5 submissions pending".

#### 2. Evaluation Interface (`/teacher/evaluate/:submissionId`)
*   **Split Screen / Top-Bottom Layout**:
    *   **Left/Top**: Student's Answer (Text or File Preview).
    *   **Right/Bottom**:
        *   Question text (Reference).
        *   Marks Input (Max marks shown).
        *   Remarks Textarea.
*   **Navigation**: "Previous", "Next" (moves to next student/question).
*   **Submit**: "Finalize Evaluation" button.

### 🟢 Student Panel

#### 1. Student Dashboard
*   **Welcome Message**.
*   **Section**: "Up Next" (Upcoming tests with countdown).
*   **Section**: "My Performance" (Mini chart).

#### 2. Test Player (`/test/:id`)
*   **Header**: Timer (Sticky), Question Palette (Grid of numbers), End Test Button.
*   **Main Content**:
    *   Question Text.
    *   Answer Input (Radio buttons / Rich Text Editor / File Upload).
*   **Footer**: "Mark for Review", "Previous", "Save & Next".

#### 3. Results Page (`/results/:id`)
*   **Score Card**: Total Marks, Percentage, Grade.
*   **Feedback**: Teacher's global remarks.
*   **Question Analysis**: Accordion list of questions showing "Your Answer", "Correct Answer" (if revealed), and "Marks Awarded".

---

## 3. Technology Stack (MERN)

*   **Frontend**: React.js (Vite), Tailwind CSS (Creating a premium UI), Redux Toolkit (State Management), React Router DOM.
*   **Backend**: Node.js, Express.js.
*   **Database**: MongoDB (Mongoose for ODM).
*   **Authentication**: JWT (JSON Web Tokens), bcryptjs.
*   **Others**:
    *   `react-quill` or `tiptap`: For Rich Text Editing.
    *   `recharts`: For charts and analytics.
    *   `multer` + Cloudinary/S3: For file uploads.
    *   `nodemailer`: For email notifications.
    *   `socket.io` (Optional): For real-time notifications.

---

## 4. Scalable Database Schema (MongoDB/Mongoose)

### 1. Users
```javascript
const UserSchema = new Schema({
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: { type: String, enum: ['Admin', 'Teacher', 'Student'] },
    institute: { type: Schema.Types.ObjectId, ref: 'Institute' },
    // Role specific fields
    studentProfile: {
        course: { type: Schema.Types.ObjectId, ref: 'Course' },
        batch: String,
        enrollmentDate: Date
    },
    teacherProfile: {
        assignedCourses: [{ type: Schema.Types.ObjectId, ref: 'Course' }],
        subjects: [String]
    },
    isActive: { type: Boolean, default: true }
});
```

### 2. Courses
```javascript
const CourseSchema = new Schema({
    name: String, // e.g., "Class 10 Science", "B.Tech CS"
    code: String,
    description: String,
    institute: { type: Schema.Types.ObjectId, ref: 'Institute' },
    subjects: [String] // e.g., ["Physics", "Chemistry"]
});
```

### 3. Tests
```javascript
const TestSchema = new Schema({
    title: String,
    description: String,
    instructions: String, // Rich text
    course: { type: Schema.Types.ObjectId, ref: 'Course' },
    subject: String,
    creator: { type: Schema.Types.ObjectId, ref: 'User' }, // Teacher or Admin
    type: { type: String, enum: ['Exam', 'Quiz', 'Assignment'] },
    
    questions: [{
        text: String,
        type: { type: String, enum: ['MCQ', 'Subjective', 'TrueFalse', 'FileUpload'] },
        options: [{ text: String, isCorrect: Boolean }], // For MCQ
        maxMarks: Number,
        fileUrl: String // If question has an image
    }],
    
    settings: {
        durationMinutes: Number,
        totalMarks: Number,
        passingMarks: Number,
        shuffleQuestions: Boolean,
        viewResultImmediately: Boolean
    },
    
    schedule: {
        startTime: Date,
        endTime: Date,
        assignedToBatch: String // Or array of Student IDs
    }
});
```

### 4. Submissions (Test Attempts)
```javascript
const SubmissionSchema = new Schema({
    test: { type: Schema.Types.ObjectId, ref: 'Test' },
    student: { type: Schema.Types.ObjectId, ref: 'User' },
    startTime: Date,
    submitTime: Date,
    status: { type: String, enum: ['In Progress', 'Submitted', 'Evaluated'] },
    
    answers: [{
        questionId: { type: Schema.Types.ObjectId },
        answerText: String, // For subjective/MCQ value
        selectedOptions: [String], // For MCQ
        fileUrl: String, // For upload
        
        // Evaluation part
        marksAwarded: Number,
        remarks: String
    }],
    
    totalScore: Number,
    teacherFeedback: String,
    evaluator: { type: Schema.Types.ObjectId, ref: 'User' }
});
```

---

## 5. API Structure Overview

### Auth
*   `POST /api/auth/login`: Authenticate and return JWT + User Info.
*   `POST /api/auth/register`: (Admin only) Create new users.

### Users (Admin)
*   `GET /api/users?role=Student`: List students with filters.
*   `GET /api/users/:id`: Get full profile.
*   `PUT /api/users/:id`: Update details.
*   `DELETE /api/users/:id`: Soft delete/deactivate.

### Tests
*   `POST /api/tests`: Create a new test.
*   `GET /api/tests`: List tests (filtered by role).
*   `GET /api/tests/:id`: Get test details (with questions if authorized).
*   `PUT /api/tests/:id`: Update test.

### Submissions
*   `POST /api/submissions/start`: Start a test attempt.
*   `PUT /api/submissions/save`: Save answers (periodic).
*   `POST /api/submissions/submit`: Final submit.
*   `GET /api/submissions/pending`: (Teacher) List pending evaluations.
*   `POST /api/submissions/:id/evaluate`: (Teacher) Submit marks and feedback.

### Analytics
*   `GET /api/stats/dashboard`: Summary counts.
*   `GET /api/stats/student/:id`: Performance history.

---

## 6. Access Control Logic (Middleware)

We will use a middleware `verifyRole(rolesArray)` in Express.

**Logic:**
1.  **Auth Middleware**: Verifies JWT token, attaches `req.user`.
2.  **Role Middleware**: Checks if `req.user.role` is included in `rolesArray`.

**Example Usage:**
*   Create Test: `router.post('/', verifyRole(['Admin', 'Teacher']), createTestController);`
*   Evaluate: `router.post('/:id/evaluate', verifyRole(['Teacher', 'Admin']), evaluateController);`
*   Take Test: `router.post('/start', verifyRole(['Student']), startTestController);`

---

## 7. UX Guidelines & Improvements
1.  **Glassmorphism**: Use semi-transparent backgrounds with blur for cards to give a modern feel.
2.  **Micro-interactions**:
    *   Hover effects on table rows.
    *   Animated checklist when questions are answered.
    *   Smooth transitions between dashboard tabs.
3.  **Loading States**: Use skeleton loaders instead of simple spinners for a premium feel.
4.  **Feedback**: Toast notifications (top-right) for every success/error action.
5.  **Accessibility**: Ensure high contrast text and keyboard navigation support.
