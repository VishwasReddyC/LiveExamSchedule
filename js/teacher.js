class Teacher {
    constructor() {
        this.currentExamType = 'midterm';
        this.currentScheduleId = null;
    }
    
    showExamScheduling() {
        const content = `
            <h3>Live Exam Scheduling</h3>
            <div class="exam-controls">
                <button onclick="teacher.createNewSchedule()">Create New Schedule</button>
                <select id="existing-schedules" onchange="teacher.loadSchedule(this.value)">
                    <option value="">Select Existing Schedule</option>
                    ${db.examSchedules.map(s => `
                        <option value="${s.id}">${s.branch} ${s.type} (${Utils.formatDate(s.startDate)})</option>
                    `).join('')}
                </select>
            </div>
            
            <div id="schedule-editor">
                ${this.renderScheduleEditor()}
            </div>
        `;
        
        document.getElementById('teacher-content').innerHTML = content;
    }

    renderScheduleEditor(schedule = null) {
        const isNew = !schedule;
        this.currentScheduleId = schedule?.id || null;
        
        return `
            <div class="schedule-form">
                <div class="form-group">
                    <label>Exam Type:</label>
                    <select id="exam-type" ${isNew ? '' : 'disabled'}>
                        <option value="midterm" ${(!schedule || schedule.type === 'midterm') ? 'selected' : ''}>Mid Term</option>
                        <option value="semester" ${schedule?.type === 'semester' ? 'selected' : ''}>Semester</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Branch:</label>
                    <select id="exam-branch" ${isNew ? '' : 'disabled'}>
                        ${['CSE', 'IT', 'CSD', 'ECE', 'EEE', 'MECH', 'CIVIL'].map(b => `
                            <option ${schedule?.branch === b ? 'selected' : ''}>${b}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="timing-controls">
                    <div class="timing-control">
                        <label>Timing 1:</label>
                        <input type="text" id="timing1" value="${schedule?.timings?.timing1 || 
                            (schedule?.type === 'midterm' ? '10:30 - 12:00' : '09:30 - 12:30')}">
                    </div>
                    <div class="timing-control">
                        <label>Timing 2:</label>
                        <input type="text" id="timing2" value="${schedule?.timings?.timing2 || 
                            (schedule?.type === 'midterm' ? '02:30 - 04:00' : '02:00 - 05:00')}">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Start Date:</label>
                    <input type="date" id="start-date" value="${schedule ? Utils.formatDate(schedule.startDate) : ''}">
                </div>
                
                <div class="schedule-actions">
                    <button onclick="teacher.generateSchedule('${schedule?.id || ''}')">
                        ${isNew ? 'Generate Schedule' : 'Update Schedule'}
                    </button>
                    ${!isNew ? `
                        <button class="delete-btn" onclick="teacher.deleteSchedule('${schedule.id}')">
                            Delete Schedule
                        </button>
                    ` : ''}
                </div>
                
                ${schedule ? this.renderScheduleCalendar(schedule) : ''}
            </div>
        `;
    }

    renderScheduleCalendar(schedule) {
        return `
            <div class="schedule-calendar">
                <h4>Generated Schedule</h4>
                <div class="calendar" id="exam-calendar"></div>
            </div>
            <script>
                teacher.generateCalendar(${JSON.stringify(schedule)});
            </script>
        `;
    }

    createNewSchedule() {
        document.getElementById('schedule-editor').innerHTML = this.renderScheduleEditor();
    }

    loadSchedule(scheduleId) {
        if (!scheduleId) return;
        
        const schedule = db.examSchedules.find(s => s.id === scheduleId);
        if (schedule) {
            document.getElementById('schedule-editor').innerHTML = this.renderScheduleEditor(schedule);
        }
    }

    generateSchedule(scheduleId = null) {
        const examType = document.getElementById('exam-type').value;
        const branch = document.getElementById('exam-branch').value;
        const timing1 = document.getElementById('timing1').value;
        const timing2 = document.getElementById('timing2').value;
        const startDate = document.getElementById('start-date').valueAsDate;
        
        if (!startDate) {
            mainApp.showError('Please select a valid start date');
            return;
        }
        
        const scheduleData = {
            type: examType,
            branch,
            startDate,
            timings: { timing1, timing2 },
            year: 'all',
            subjects: JSON.parse(JSON.stringify(db.branchSubjects[branch]))
        };
        
        if (scheduleId) {
            // Update existing schedule
            const success = db.updateExamSchedule(scheduleId, scheduleData);
            if (success) {
                const updatedSchedule = db.examSchedules.find(s => s.id === scheduleId);
                document.getElementById('schedule-editor').innerHTML = 
                    this.renderScheduleEditor(updatedSchedule);
                mainApp.showSuccess('Schedule updated successfully');
            }
        } else {
            // Create new schedule
            const newSchedule = db.createExamSchedule({
                ...scheduleData,
                schedule: db.generateExamDates(startDate, branch, examType)
            });
            document.getElementById('schedule-editor').innerHTML = 
                this.renderScheduleEditor(newSchedule);
            mainApp.showSuccess('Schedule created successfully');
            
            // Update the dropdown
            const select = document.getElementById('existing-schedules');
            const option = document.createElement('option');
            option.value = newSchedule.id;
            option.textContent = `${newSchedule.branch} ${newSchedule.type} (${Utils.formatDate(newSchedule.startDate)})`;
            select.appendChild(option);
        }
    }

    deleteSchedule(scheduleId) {
        mainApp.showConfirmation(
            'Are you sure you want to delete this schedule?',
            `teacher.confirmDeleteSchedule('${scheduleId}')`
        );
    }

    confirmDeleteSchedule(scheduleId) {
        db.deleteExamSchedule(scheduleId);
        document.getElementById('existing-schedules').querySelector(`option[value="${scheduleId}"]`).remove();
        document.getElementById('schedule-editor').innerHTML = this.renderScheduleEditor();
        mainApp.showSuccess('Schedule deleted successfully');
    }

    generateCalendar(schedule) {
        const calendarDiv = document.getElementById('exam-calendar');
        calendarDiv.innerHTML = '';
        
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // Header
        const headerDiv = document.createElement('div');
        headerDiv.className = 'calendar-header';
        
        days.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            headerDiv.appendChild(dayHeader);
        });
        
        calendarDiv.appendChild(headerDiv);
        
        // Get all unique dates from schedule
        const uniqueDates = [...new Set(schedule.schedule.map(exam => Utils.formatDate(exam.date)))];
        
        let currentDate = new Date(schedule.startDate);
        const endDate = new Date(currentDate);
        endDate.setDate(endDate.getDate() + 30); // Show 1 month
        
        while (currentDate <= endDate) {
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const dateDiv = document.createElement('div');
            dateDiv.className = 'calendar-date';
            dateDiv.textContent = currentDate.toLocaleDateString();
            dayDiv.appendChild(dateDiv);
            
            // Add exams for this date
            schedule.schedule
                .filter(exam => Utils.formatDate(exam.date) === Utils.formatDate(currentDate))
                .forEach(exam => {
                    const examDiv = document.createElement('div');
                    examDiv.className = 'exam-subject';
                    examDiv.innerHTML = `
                        <div class="subject-edit">
                            <span>${exam.subject} (Y${exam.year})</span>
                            <button class="edit-subject-btn" 
                                    onclick="teacher.editExamSubject('${schedule.id}', '${Utils.formatDate(exam.date)}', '${exam.subject}')">
                                Edit
                            </button>
                        </div>
                        <div class="exam-timing">
                            ${exam.timing === 'timing1' ? schedule.timings.timing1 : schedule.timings.timing2}
                        </div>
                    `;
                    dayDiv.appendChild(examDiv);
                });
            
            calendarDiv.appendChild(dayDiv);
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    editExamSubject(scheduleId, dateStr, subject) {
        const schedule = db.examSchedules.find(s => s.id === scheduleId);
        if (!schedule) return;
        
        const date = new Date(dateStr);
        const exam = schedule.schedule.find(e => 
            Utils.formatDate(e.date) === Utils.formatDate(date) && 
            e.subject === subject
        );
        
        if (!exam) return;
        
        const modalContent = `
            <p>Editing <strong>${subject}</strong> on ${Utils.formatDate(date)}</p>
            <div class="form-group">
                <label>Timing:</label>
                <select id="edit-exam-timing">
                    <option value="timing1" ${exam.timing === 'timing1' ? 'selected' : ''}>
                        ${schedule.timings.timing1}
                    </option>
                    <option value="timing2" ${exam.timing === 'timing2' ? 'selected' : ''}>
                        ${schedule.timings.timing2}
                    </option>
                </select>
            </div>
            <div class="form-group">
                <label>Reschedule Date:</label>
                <input type="date" id="edit-exam-date" value="${Utils.formatDate(date)}">
            </div>
        `;
        
        mainApp.showModal(
            `Edit Exam - ${subject}`,
            modalContent,
            [
                {
                    text: 'Save Changes',
                    primary: true,
                    onClick: `teacher.saveExamChanges('${scheduleId}', '${dateStr}', '${subject}')`
                }
            ]
        );
    }

    saveExamChanges(scheduleId, oldDateStr, subject) {
        const schedule = db.examSchedules.find(s => s.id === scheduleId);
        if (!schedule) return;
        
        const oldDate = new Date(oldDateStr);
        const newDate = document.getElementById('edit-exam-date').valueAsDate;
        const newTiming = document.getElementById('edit-exam-timing').value;
        
        // Find and update the exam
        const examIndex = schedule.schedule.findIndex(e => 
            Utils.formatDate(e.date) === Utils.formatDate(oldDate) && 
            e.subject === subject
        );
        
        if (examIndex !== -1) {
            schedule.schedule[examIndex] = {
                ...schedule.schedule[examIndex],
                date: newDate,
                timing: newTiming
            };
            
            db.saveToLocalStorage();
            document.getElementById('exam-calendar').innerHTML = '';
            this.generateCalendar(schedule);
            mainApp.showSuccess('Exam updated successfully');
            mainApp.closeModal(`modal-${Date.now()}`);
        }
    }

    showRoomAllocation() {
        const content = `
            <h3>Room Allocation</h3>
            <div class="room-allocation-container">
                <div class="selection-controls">
                    <div>
                        <label><input type="checkbox" id="select-all" onclick="teacher.toggleSelectAll()"> SELECT ALL</label>
                    </div>
                    
                    <div style="display: flex; gap: 2rem; margin-top: 1rem;">
                        <div>
                            <h5>By Year:</h5>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="year" value="1" onchange="teacher.updateStudentSelection()"> 1st Year</label><br>
                                <label><input type="checkbox" name="year" value="2" onchange="teacher.updateStudentSelection()"> 2nd Year</label><br>
                                <label><input type="checkbox" name="year" value="3" onchange="teacher.updateStudentSelection()"> 3rd Year</label><br>
                                <label><input type="checkbox" name="year" value="4" onchange="teacher.updateStudentSelection()"> 4th Year</label>
                            </div>
                        </div>
                        
                        <div>
                            <h5>By Branch:</h5>
                            <div class="checkbox-group">
                                <label><input type="checkbox" name="branch" value="CSE" onchange="teacher.updateStudentSelection()"> CSE</label><br>
                                <label><input type="checkbox" name="branch" value="IT" onchange="teacher.updateStudentSelection()"> IT</label><br>
                                <label><input type="checkbox" name="branch" value="CSD" onchange="teacher.updateStudentSelection()"> CSD</label><br>
                                <label><input type="checkbox" name="branch" value="ECE" onchange="teacher.updateStudentSelection()"> ECE</label><br>
                                <label><input type="checkbox" name="branch" value="EEE" onchange="teacher.updateStudentSelection()"> EEE</label><br>
                                <label><input type="checkbox" name="branch" value="MECH" onchange="teacher.updateStudentSelection()"> MECH</label><br>
                                <label><input type="checkbox" name="branch" value="CIVIL" onchange="teacher.updateStudentSelection()"> CIVIL</label>
                            </div>
                        </div>
                    </div>
                    
                    <div id="student-list" class="student-list">
                        ${this.generateStudentList()}
                    </div>
                    
                    <div class="exam-type-selection" style="margin-top: 1rem;">
                        <label>Exam Type: 
                            <select id="room-allocation-exam-type">
                                <option value="midterm">Mid Term</option>
                                <option value="semester">Semester</option>
                            </select>
                        </label>
                    </div>
                    
                    <button onclick="teacher.allocateRooms()" style="margin-top: 1rem;">Allocate Rooms</button>
                </div>
                
                <div id="room-allocation-result" class="room-allocation-result"></div>
            </div>
        `;
        
        document.getElementById('teacher-content').innerHTML = content;
    }

    generateStudentList() {
        let studentListHTML = '<h5>Select Students:</h5>';
        studentListHTML += '<div class="student-list-container">';
        
        db.students.forEach(student => {
            studentListHTML += `
                <div>
                    <label>
                        <input type="checkbox" class="student-checkbox" 
                               value="${student.rollNumber}" 
                               data-year="${student.year}" 
                               data-branch="${student.branch}">
                        ${student.rollNumber} - ${student.name} (${student.branch})
                    </label>
                </div>
            `;
        });
        
        studentListHTML += '</div>';
        return studentListHTML;
    }

    toggleSelectAll() {
        const selectAll = document.getElementById('select-all').checked;
        const checkboxes = document.querySelectorAll('.student-checkbox');
        
        checkboxes.forEach(checkbox => {
            checkbox.checked = selectAll;
        });
    }

    updateStudentSelection() {
        const selectedYears = Array.from(document.querySelectorAll('input[name="year"]:checked')).map(y => y.value);
        const selectedBranches = Array.from(document.querySelectorAll('input[name="branch"]:checked')).map(b => b.value);
        
        const checkboxes = document.querySelectorAll('.student-checkbox');
        
        checkboxes.forEach(checkbox => {
            const year = checkbox.dataset.year;
            const branch = checkbox.dataset.branch;
            
            if ((selectedYears.length === 0 || selectedYears.includes(year)) && 
                (selectedBranches.length === 0 || selectedBranches.includes(branch))) {
                checkbox.checked = true;
            } else {
                checkbox.checked = false;
            }
        });
    }

    allocateRooms() {
        const selectedStudents = Array.from(document.querySelectorAll('.student-checkbox:checked')).map(s => s.value);
        const examType = document.getElementById('room-allocation-exam-type').value;
        
        if (selectedStudents.length === 0) {
            mainApp.showError('Please select at least one student');
            return;
        }
        
        // Group students by year and branch
        const groupedStudents = {};
        selectedStudents.forEach(roll => {
            const student = db.getStudentByRollNumber(roll);
            if (student) {
                const key = `Y${student.year}-${student.branch}`;
                if (!groupedStudents[key]) {
                    groupedStudents[key] = [];
                }
                groupedStudents[key].push(roll);
            }
        });
        
        // Allocate rooms
        const rooms = ['LH01', 'LH02', 'LH03', 'LH04', 'LH05', 'LH101', 'LH102', 'LH103', 'LH104', 'LH105'];
        let roomIndex = 0;
        let allocationHTML = '<h4>Room Allocation Result</h4>';
        
        Object.keys(groupedStudents).forEach(group => {
            const students = groupedStudents[group];
            const [_, year, branch] = group.match(/Y(\d+)-(.*)/);
            
            allocationHTML += `<h5>Year ${year} ${branch} Students</h5>`;
            
            // Split students into rooms
            for (let i = 0; i < students.length; i += 18) {
                if (roomIndex >= rooms.length) {
                    allocationHTML += '<p class="error">Not enough rooms available!</p>';
                    break;
                }
                
                const roomStudents = students.slice(i, i + 18);
                allocationHTML += this.generateRoomLayout(rooms[roomIndex], roomStudents, year, branch, examType);
                
                // Save allocation to database
                db.roomAllocations.push({
                    room: rooms[roomIndex],
                    students: roomStudents,
                    branch,
                    year: parseInt(year),
                    examType,
                    date: new Date()
                });
                
                roomIndex++;
            }
        });
        
        db.saveToLocalStorage();
        document.getElementById('room-allocation-result').innerHTML = allocationHTML;
        mainApp.showSuccess('Rooms allocated successfully');
    }

    generateRoomLayout(roomName, students, year, branch, examType) {
        let layoutHTML = `
            <div class="room">
                <div class="room-header">
                    <h6>Room: ${roomName}</h6>
                    <div>Year ${year} ${branch} - ${examType === 'midterm' ? 'Mid Term' : 'Semester'} Exams</div>
                </div>
                <div class="room-layout">
                    <div class="room-front">Front of Room</div>
                    <div class="seating-grid">
        `;
        
        // Create 3 columns x 6 rows layout
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 3; col++) {
                const studentIndex = row * 3 + col;
                const student = students[studentIndex];
                
                layoutHTML += `
                    <div class="seat ${student ? 'seat-occupied' : ''}">
                        ${student || ''}
                    </div>
                `;
            }
        }
        
        layoutHTML += `
                    </div>
                </div>
            </div>
        `;
        
        return layoutHTML;
    }

    showRequests() {
        const content = `
            <h3>Teacher Requests</h3>
            <div class="requests-container">
                ${db.teacherRequests.length === 0 ? 
                    '<p>No pending requests</p>' : 
                    this.generateRequestsList()}
            </div>
        `;
        
        document.getElementById('teacher-content').innerHTML = content;
    }

    generateRequestsList() {
        return `
            <table class="requests-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Requested By</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${db.teacherRequests.map(request => `
                        <tr>
                            <td>${request.teacherData.name}</td>
                            <td>${request.teacherData.username}</td>
                            <td>${request.teacherData.email}</td>
                            <td>${request.requestedBy}</td>
                            <td>
                                <button onclick="teacher.approveRequest('${request.id}')">Approve</button>
                                <button onclick="teacher.rejectRequest('${request.id}')">Reject</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    approveRequest(requestId) {
        const newTeacher = db.approveTeacherRequest(requestId);
        if (newTeacher) {
            this.showRequests();
            mainApp.showSuccess(`Teacher ${newTeacher.username} approved successfully`);
        }
    }

    rejectRequest(requestId) {
        db.rejectTeacherRequest(requestId);
        this.showRequests();
        mainApp.showSuccess('Request rejected');
    }

    showTeacherManagement() {
        if (!auth.currentUser.isAdmin) {
            mainApp.showError('Only admin teachers can access this feature');
            return;
        }
        
        const content = `
            <h3>Teacher Management</h3>
            <div class="teacher-management">
                <h4>Existing Teachers</h4>
                ${this.generateTeacherList()}
            </div>
        `;
        
        document.getElementById('teacher-content').innerHTML = content;
    }

    generateTeacherList() {
        return `
            <table class="teacher-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Admin</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${db.teachers.map(teacher => `
                        <tr>
                            <td>${teacher.username}</td>
                            <td>${teacher.name}</td>
                            <td>${teacher.email}</td>
                            <td>${teacher.isAdmin ? 'Yes' : 'No'}</td>
                            <td>${teacher.approved ? 'Approved' : 'Pending'}</td>
                            <td>
                                ${!teacher.isAdmin ? `
                                    <button onclick="teacher.toggleAdmin('${teacher.id}', ${!teacher.isAdmin})">
                                        ${teacher.isAdmin ? 'Remove Admin' : 'Make Admin'}
                                    </button>
                                    <button class="delete-btn" onclick="teacher.deleteTeacher('${teacher.id}')">
                                        Delete
                                    </button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    toggleAdmin(teacherId, makeAdmin) {
        const teacher = db.teachers.find(t => t.id === teacherId);
        if (teacher) {
            teacher.isAdmin = makeAdmin;
            db.saveToLocalStorage();
            this.showTeacherManagement();
            mainApp.showSuccess(`Admin status updated for ${teacher.username}`);
        }
    }

    deleteTeacher(teacherId) {
        if (teacherId === auth.currentUser.id) {
            mainApp.showError('You cannot delete your own account');
            return;
        }
        
        mainApp.showConfirmation(
            'Are you sure you want to delete this teacher?',
            `teacher.confirmDeleteTeacher('${teacherId}')`
        );
    }

    confirmDeleteTeacher(teacherId) {
        db.teachers = db.teachers.filter(t => t.id !== teacherId);
        db.saveToLocalStorage();
        this.showTeacherManagement();
        mainApp.showSuccess('Teacher deleted successfully');
    }
}

const teacher = new Teacher();