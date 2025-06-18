class Auth {
    constructor() {
        this.currentUser = null;
        this.initEventListeners();
    }
    
    initEventListeners() {
        document.getElementById('teacher-login-btn')?.addEventListener('click', () => this.teacherLogin());
        document.getElementById('student-login-btn')?.addEventListener('click', () => this.studentLogin());
    }
    
    teacherLogin() {
        const username = document.getElementById('teacher-username').value;
        const password = document.getElementById('teacher-password').value;
        
        const teacher = db.getTeacherByUsername(username);
        
        if (teacher && teacher.password === password) {
            if (!teacher.approved) {
                document.getElementById('teacher-login-message').textContent = 
                    "Your account is pending approval. Please contact admin.";
                return;
            }
            
            this.currentUser = {
                type: 'teacher',
                id: teacher.id,
                username: teacher.username,
                name: teacher.name,
                isAdmin: teacher.isAdmin
            };
            this.showTeacherDashboard();
        } else {
            document.getElementById('teacher-login-message').textContent = 
                "Invalid credentials. Please try again.";
        }
    }
    
    studentLogin() {
        const rollNumber = document.getElementById('student-roll').value;
        
        if (!rollNumber) {
            alert('Please enter your roll number');
            return;
        }
        
        const student = db.getStudentByRollNumber(rollNumber);
        
        if (student) {
            this.currentUser = {
                type: 'student',
                rollNumber: student.rollNumber,
                name: student.name,
                branch: student.branch,
                year: student.year
            };
            this.showStudentDashboard();
        } else {
            alert('Student not found. Please check your roll number.');
        }
    }
    
    showTeacherDashboard() {
        document.querySelector('.login-container').style.display = 'none';
        
        const dashboardHTML = `
            <div class="dashboard" id="teacher-dashboard">
                <div class="dashboard-header">
                    <h2>Teacher Dashboard - Welcome, ${this.currentUser.name}</h2>
                    <div class="dashboard-actions">
                        <button onclick="teacher.showRequests()" class="btn-requests">
                            Requests (${db.teacherRequests.length})
                        </button>
                        <button onclick="auth.logout()">Logout</button>
                    </div>
                </div>
                <div class="dashboard-options">
                    <div class="dashboard-option" onclick="teacher.showExamScheduling()">Live Exam Schedule</div>
                    <div class="dashboard-option" onclick="teacher.showRoomAllocation()">Room Allocation</div>
                    ${this.currentUser.isAdmin ? 
                        '<div class="dashboard-option" onclick="teacher.showTeacherManagement()">Teacher Management</div>' : ''}
                </div>
                <div id="teacher-content"></div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dashboardHTML);
        teacher.showExamScheduling();
    }
    
    showStudentDashboard() {
        document.querySelector('.login-container').style.display = 'none';
        
        const dashboardHTML = `
            <div class="dashboard" id="student-dashboard">
                <div class="dashboard-header">
                    <h2>Student Dashboard - ${this.currentUser.rollNumber}</h2>
                    <button onclick="auth.logout()">Logout</button>
                </div>
                <div class="dashboard-options">
                    <div class="dashboard-option" onclick="student.showTimetable()">Scheduled Timetable</div>
                    <div class="dashboard-option" onclick="student.showAllocatedRoom()">Allocated Room</div>
                </div>
                <div id="student-content"></div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', dashboardHTML);
        student.showTimetable();
    }
    
    logout() {
        this.currentUser = null;
        document.querySelector('.dashboard')?.remove();
        document.querySelector('.login-container').style.display = 'block';
        
        // Clear form fields
        document.getElementById('teacher-username').value = '';
        document.getElementById('teacher-password').value = '';
        document.getElementById('student-roll').value = '';
    }
}

const auth = new Auth();