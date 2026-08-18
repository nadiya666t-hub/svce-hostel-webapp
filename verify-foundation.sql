-- Semesters
SELECT label, "startDate"::date, "endDate"::date, "isCurrent" FROM semesters ORDER BY "semesterNumber";

-- Hostel allocations
SELECT ha.status, ha."allocatedAt"::date, r."roomNumber", f."floorNumber", s.name
FROM hostel_allocations ha
JOIN students s ON s.id = ha."studentId"
JOIN rooms r ON r.id = ha."roomId"
JOIN floors f ON f.id = r."floorId"
ORDER BY s.name;

-- Student master new fields
SELECT name, course, branch, "admissionYear", gender, "importSource", status
FROM students ORDER BY name;

-- Academic history with semester FK
SELECT s.name, ah."yearLabel", ah."semesterLabel", ah."yearNumber", sem.label AS sem_label
FROM student_academic_history ah
JOIN students s ON s.id = ah."studentId"
LEFT JOIN semesters sem ON sem.id = ah."semesterId"
ORDER BY s.name;
