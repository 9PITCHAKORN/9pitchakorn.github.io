// app.js
import { db } from './firebase-config.js';
// สมมติว่า import คำสั่งของ firebase/firestore มาแล้ว (collection, addDoc, getDocs ฯลฯ)

// แสดงวันที่ปัจจุบัน
const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
document.getElementById('currentDate').innerText = new Date().toLocaleDateString('th-TH', dateOptions);

// จำลองข้อมูลรายชื่อนักเรียน (ในระบบจริงจะดึงจาก Settings ใน Firebase)
const students = [
    { id: 1, name: "ด.ช. สมชาย ใจดี" },
    { id: 2, name: "ด.ญ. สมหญิง รักเรียน" },
    { id: 3, name: "ด.ช. มานะ อดทน" }
];

// ฟังก์ชันสร้างแถวรายชื่อ
function renderStudents() {
    const tbody = document.getElementById('studentList');
    tbody.innerHTML = '';

    students.forEach((student, index) => {
        const tr = document.createElement('tr');
        tr.className = index % 2 === 0 ? "bg-white border-b" : "bg-gray-50 border-b";
        
        tr.innerHTML = `
            <td class="p-3 text-center">${student.id}</td>
            <td class="p-3 font-medium">${student.name}</td>
            <td class="p-3">
                <div class="flex justify-center space-x-2 md:space-x-4">
                    <label class="flex flex-col items-center cursor-pointer">
                        <input type="radio" name="status_${student.id}" value="present" class="form-radio h-5 w-5 text-green-600" required>
                        <span class="text-xs text-green-600 mt-1">มา</span>
                    </label>
                    <label class="flex flex-col items-center cursor-pointer">
                        <input type="radio" name="status_${student.id}" value="absent" class="form-radio h-5 w-5 text-red-600">
                        <span class="text-xs text-red-600 mt-1">ขาด</span>
                    </label>
                    <label class="flex flex-col items-center cursor-pointer">
                        <input type="radio" name="status_${student.id}" value="sick" class="form-radio h-5 w-5 text-yellow-500">
                        <span class="text-xs text-yellow-500 mt-1">ป่วย</span>
                    </label>
                    <label class="flex flex-col items-center cursor-pointer">
                        <input type="radio" name="status_${student.id}" value="leave" class="form-radio h-5 w-5 text-blue-500">
                        <span class="text-xs text-blue-500 mt-1">ลากิจ</span>
                    </label>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ฟังก์ชันเลือกทั้งหมด (ต้องทำให้เข้าถึงได้จาก HTML แบบ Global)
window.selectAll = function(statusValue) {
    students.forEach(student => {
        const radios = document.getElementsByName(`status_${student.id}`);
        for(let i=0; i<radios.length; i++){
            if(radios[i].value === statusValue){
                radios[i].checked = true;
            }
        }
    });
}

// เริ่มต้นวาดรายชื่อตอนเปิดหน้าเว็บ
renderStudents();

// ฟังก์ชันบันทึกข้อมูล
document.getElementById('submitBtn').addEventListener('click', async () => {
    const checker = document.getElementById('checkerName').value;
    if(!checker) {
        alert('กรุณาระบุชื่อผู้กรอกข้อมูลครับ!');
        return;
    }

    const attendanceData = [];
    let isComplete = true;

    students.forEach(student => {
        const selected = document.querySelector(`input[name="status_${student.id}"]:checked`);
        if(!selected) {
            isComplete = false;
        } else {
            attendanceData.push({
                studentId: student.id,
                studentName: student.name,
                status: selected.value
            });
        }
    });

    if(!isComplete) {
        alert('กรุณาเช็คชื่อให้ครบทุกคนครับ!');
        return;
    }

    const payload = {
        date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        timestamp: new Date(),
        checkerName: checker,
        records: attendanceData
    };

    console.log("ข้อมูลพร้อมส่งเข้า Firebase:", payload);
    alert('บันทึกข้อมูลสำเร็จ! (จำลองการส่งข้อมูล)');
    
    // ตรงนี้จะเป็นโค้ดส่งเข้า Firestore
    // try {
    //     await addDoc(collection(db, "attendance"), payload);
    //     alert("บันทึกข้อมูลลง Firebase สำเร็จ!");
    //     window.location.reload();
    // } catch (e) {
    //     console.error("Error: ", e);
    // }
});