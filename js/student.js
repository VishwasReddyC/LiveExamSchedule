class Student {
    constructor() {
        this.currentExamType = 'midterm';
    }
    
    showTimetable() {
        const content = `
            <h3>Your Exam Schedule</h3>
            <div class="exam-type-toggle">
                <button class="${this.currentExamType === 'midterm' ? 'active' : ''}" 
                        onclick="student.setExamType('midterm')">Mid Term</button>
                <button class="${this.currentExamType === 'semester' ? 'active' : ''}" 
                        onclick="student.setExamType('semester')">Semester</button>
            </div>
            
            <div class="timetable-search">
                <input type="text" id="search-roll" placeholder="Enter your roll number" 
                       value="${auth.currentUser?.rollNumber || ''}">
                <button onclick="student.searchTimetable()">Search</button>
            </div>
            
            <div id="timetable-result" class="timetable-result">
                ${this.renderTimetable()}
            </div>
        `;
        
        document.getElementById('student-content').innerHTML = content;
    }
    
    setExamType(type) {
        this.currentExamType = type;
        this.searchTimetable();
    }
    
    searchTimetable() {
        const rollNumber = document.getElementById('search-roll').value.trim();
        
        if (!rollNumber) {
            mainApp.showError('Please enter your roll number');
            return;
        }
        
        const student = db.getStudentByRollNumber(rollNumber);
        
        if (!student) {
            mainApp.showError('Student not found. Please check your roll number.');
            return;
        }
        
        document.getElementById('timetable-result').innerHTML = this.renderTimetable(student);
    }
    
    renderTimetable(student = null) {
        if (!student && !auth.currentUser?.rollNumber) {
            return '<p>Please enter your roll number to view timetable</p>';
        }
        
        const currentStudent = student || db.getStudentByRollNumber(auth.currentUser.rollNumber);
        if (!currentStudent) return '<p>Student not found</p>';
        
        const schedules = db.getExamSchedules(currentStudent.branch, currentStudent.year, this.currentExamType);
        if (schedules.length === 0) return '<p>No schedule found for your branch/year</p>';
        
        let timetableHTML = `
            <h4>Exam Schedule for ${currentStudent.rollNumber} (Year ${currentStudent.year} ${currentStudent.branch})</h4>
            <p>Exam Type: ${this.currentExamType === 'midterm' ? 'Mid Term' : 'Semester'}</p>
            
            <table class="timetable-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Subject</th>
                        <th>Timing</th>
                        <th>Room</th>
                        <th>Seat</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        schedules.forEach(schedule => {
            schedule.schedule
                .filter(exam => exam.year === currentStudent.year)
                .forEach(exam => {
                    const roomAllocation = db.getRoomForStudent(currentStudent.rollNumber, this.currentExamType, exam.date);
                    const timing = exam.timing === 'timing1' ? schedule.timings.timing1 : schedule.timings.timing2;
                    
                    timetableHTML += `
                        <tr>
                            <td>${exam.date.toLocaleDateString()}</td>
                            <td>${exam.subject}</td>
                            <td>${timing}</td>
                            <td>${roomAllocation?.room || 'TBA'}</td>
                            <td>${roomAllocation ? `Row ${roomAllocation.row}, Col ${roomAllocation.col}` : 'TBA'}</td>
                        </tr>
                    `;
                });
        });
        
        timetableHTML += `
                </tbody>
            </table>
        `;
        
        return timetableHTML;
    }
    
    showAllocatedRoom() {
        const content = `
            <h3>Your Allocated Exam Room</h3>
            <div class="exam-type-toggle">
                <button class="${this.currentExamType === 'midterm' ? 'active' : ''}" 
                        onclick="student.setRoomExamType('midterm')">Mid Term</button>
                <button class="${this.currentExamType === 'semester' ? 'active' : ''}" 
                        onclick="student.setRoomExamType('semester')">Semester</button>
            </div>
            
            <div class="room-search">
                <input type="text" id="search-room-roll" placeholder="Enter your roll number" 
                       value="${auth.currentUser?.rollNumber || ''}">
                <button onclick="student.searchRoom()">Search</button>
            </div>
            
            <div id="room-result" class="room-result">
                ${this.renderRoomAllocation()}
            </div>
        `;
        
        document.getElementById('student-content').innerHTML = content;
    }
    
    setRoomExamType(type) {
        this.currentExamType = type;
        this.searchRoom();
    }
    
    searchRoom() {
        const rollNumber = document.getElementById('search-room-roll').value.trim();
        
        if (!rollNumber) {
            mainApp.showError('Please enter your roll number');
            return;
        }
        
        document.getElementById('room-result').innerHTML = this.renderRoomAllocation(rollNumber);
    }
    
    renderRoomAllocation(rollNumber = null) {
        const currentRoll = rollNumber || auth.currentUser?.rollNumber;
        if (!currentRoll) return '<p>Please enter your roll number</p>';
        
        const student = db.getStudentByRollNumber(currentRoll);
        if (!student) return '<p>Student not found</p>';
        
        const roomAllocation = db.getRoomForStudent(currentRoll, this.currentExamType);
        if (!roomAllocation) {
            return `
                <div class="room-not-found">
                    <p>Room not yet allocated for ${currentRoll}</p>
                    <p>Exam Type: ${this.currentExamType === 'midterm' ? 'Mid Term' : 'Semester'}</p>
                </div>
            `;
        }
        
        const roomStudents = db.roomAllocations.find(a => 
            a.room === roomAllocation.room && 
            a.examType === this.currentExamType
        )?.students || [];
        
        return `
            <div class="room-allocation-details">
                <h4>Room Allocation Details</h4>
                <div class="student-info">
                    <p><strong>Roll Number:</strong> ${currentRoll}</p>
                    <p><strong>Name:</strong> ${student.name}</p>
                    <p><strong>Year:</strong> ${student.year}</p>
                    <p><strong>Branch:</strong> ${student.branch}</p>
                </div>
                
                <div class="room-info">
                    <p><strong>Exam Type:</strong> ${this.currentExamType === 'midterm' ? 'Mid Term' : 'Semester'}</p>
                    <p><strong>Room Number:</strong> ${roomAllocation.room}</p>
                    <p><strong>Seat Position:</strong> Row ${roomAllocation.row}, Column ${roomAllocation.col}</p>
                </div>
                
                <div class="room-layout-container">
                    <h5>Room Layout (${roomAllocation.room}):</h5>
                    ${this.generateRoomLayout(roomStudents, currentRoll)}
                </div>
                
                <div class="exam-instructions">
                    <h5>Exam Instructions:</h5>
                    <ul>
                        <li>Arrive at least 30 minutes before exam time</li>
                        <li>Bring your student ID and exam admission ticket</li>
                        <li>No electronic devices allowed</li>
                        <li>Follow all exam hall rules and regulations</li>
                    </ul>
                </div>
            </div>
        `;
    }
    
    generateRoomLayout(students, highlightRoll) {
        if (!students || students.length === 0) return '<p>Room layout not available</p>';
        
        let layoutHTML = `
            <div class="room-layout">
                <div class="room-front">▲ Front of Room</div>
                <div class="seating-grid">
        `;
        
        // Create 3 columns x 6 rows layout
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 3; col++) {
                const studentIndex = row * 3 + col;
                const studentRoll = students[studentIndex];
                const isHighlighted = studentRoll === highlightRoll;
                
                layoutHTML += `
                    <div class="seat ${studentRoll ? 'seat-occupied' : ''} ${isHighlighted ? 'seat-highlight' : ''}">
                        ${isHighlighted ? studentRoll : (studentRoll ? studentRoll.substring(6) : '')}
                    </div>
                `;
            }
        }
        
        layoutHTML += `
                </div>
            </div>
        `;
        
        return layoutHTML;
    }
}

const student = new Student();