-- Insert 50 aptitude test questions across 5 engineering topics
-- Generated for Phase 3 Applicant Portal

INSERT INTO test_questions (id, text, options, correct_answer_index, difficulty, topic, created_at) VALUES
-- Statics (10)
('q-statics-001', 'A 100 N force is applied at 30° above the horizontal. What is the vertical component?', '["50 N", "86.6 N", "75 N", "100 N"]', 1, 'easy', 'statics', 0),
('q-statics-002', 'In equilibrium, the sum of moments about any point equals:', '["Force", "Zero", "Infinity", "One"]', 1, 'easy', 'statics', 0),
('q-statics-003', 'What is the center of gravity of a uniform triangular plate?', '["Corner", "1/3 from base", "Midpoint", "1/2 from base"]', 1, 'medium', 'statics', 0),
('q-statics-004', 'A 10 m beam with supports at ends carries a 500 N load at midspan. Reaction force at each support is:', '["250 N", "500 N", "1000 N", "100 N"]', 0, 'medium', 'statics', 0),
('q-statics-005', 'The coefficient of static friction is typically:', '["< 0", "0-1", "1-5", "> 5"]', 1, 'easy', 'statics', 0),
('q-statics-006', 'For a 3-4-5 triangle, if the 3 m side is horizontal, the angle is approximately:', '["30°", "37°", "45°", "53°"]', 3, 'medium', 'statics', 0),
('q-statics-007', 'A leaning ladder makes 60° with ground. The friction coefficient must be at least:', '["0.29", "0.58", "0.87", "1.73"]', 1, 'hard', 'statics', 0),
('q-statics-008', 'Shear force is maximum where bending moment is:', '["Minimum", "Maximum", "Zero", "Constant"]', 2, 'medium', 'statics', 0),
('q-statics-009', 'For a cantilever beam, the support reaction moment acts at:', '["Free end", "Fixed end", "Midspan", "1/4 length"]', 1, 'easy', 'statics', 0),
('q-statics-010', 'Three forces (3N, 4N, 5N) in equilibrium form a:', '["Triangle", "Rectangle", "Pentagon", "Hexagon"]', 0, 'hard', 'statics', 0),

-- Dynamics (10)
('q-dynamics-001', 'F = ma. If F = 100 N and a = 5 m/s², what is m?', '["5 kg", "20 kg", "500 kg", "0.05 kg"]', 1, 'easy', 'dynamics', 0),
('q-dynamics-002', 'An object accelerates at 2 m/s² from rest. After 5 seconds, velocity is:', '["2 m/s", "5 m/s", "10 m/s", "25 m/s"]', 2, 'easy', 'dynamics', 0),
('q-dynamics-003', 'Kinetic energy depends on:', '["Mass and velocity", "Force and distance", "Mass and height", "Velocity and time"]', 0, 'easy', 'dynamics', 0),
('q-dynamics-004', 'An object thrown up decelerates due to:', '["Air resistance", "Friction", "Gravity", "Speed"]', 2, 'easy', 'dynamics', 0),
('q-dynamics-005', 'Work = Force × Distance. Unit in SI is:', '["Newton", "Joule", "Watt", "Pascal"]', 1, 'easy', 'dynamics', 0),
('q-dynamics-006', 'Conservation of momentum: m1*v1 + m2*v2 before = _____ after collision', '["Unchanged", "Doubled", "Halved", "Negative"]', 0, 'medium', 'dynamics', 0),
('q-dynamics-007', 'Power is the rate of doing:', '["Distance", "Force", "Work", "Acceleration"]', 2, 'easy', 'dynamics', 0),
('q-dynamics-008', 'Angular acceleration unit is:', '["rad/s", "rad/s²", "rpm", "Hz"]', 1, 'medium', 'dynamics', 0),
('q-dynamics-009', 'A 1000 kg car accelerates 0-100 km/h in 10 s. Average force ≈:', '["2778 N", "10000 N", "1000 N", "100 N"]', 0, 'hard', 'dynamics', 0),
('q-dynamics-010', 'Torque = Force × Radius. Unit is:', '["Newton", "Joule", "Newton-meter", "Watt"]', 2, 'medium', 'dynamics', 0),

-- Circuits (10)
('q-circuits-001', 'Ohm\'s Law: V = I × R. If I = 2 A and R = 5 Ω, V is:', '["2.5 V", "5 V", "10 V", "15 V"]', 2, 'easy', 'circuits', 0),
('q-circuits-002', 'In series, resistances:', '["Add", "Reciprocal sum", "Multiply", "Divide"]', 0, 'easy', 'circuits', 0),
('q-circuits-003', 'In parallel, voltage across branches is:', '["Different", "Same", "Sum of currents", "Zero"]', 1, 'easy', 'circuits', 0),
('q-circuits-004', 'Power dissipated in resistor: P = I²R. Unit is:', '["Volt", "Ohm", "Watt", "Ampere"]', 2, 'easy', 'circuits', 0),
('q-circuits-005', 'A capacitor stores:', '["Current", "Voltage", "Charge", "Resistance"]', 2, 'medium', 'circuits', 0),
('q-circuits-006', 'Inductance unit is:', '["Farad", "Henry", "Ohm", "Siemens"]', 1, 'medium', 'circuits', 0),
('q-circuits-007', 'AC frequency in most countries is:', '["50-60 Hz", "1000 Hz", "10 kHz", "1 MHz"]', 0, 'easy', 'circuits', 0),
('q-circuits-008', 'Impedance combines resistance and:', '["Voltage", "Current", "Reactance", "Power"]', 2, 'hard', 'circuits', 0),
('q-circuits-009', 'Three 100 Ω resistors in parallel give total R of:', '["300 Ω", "33.3 Ω", "100 Ω", "10 Ω"]', 1, 'medium', 'circuits', 0),
('q-circuits-010', 'Kirchhoff\'s current law states currents at node:', '["Multiply", "Sum to zero", "Are equal", "Alternate"]', 1, 'hard', 'circuits', 0),

-- Programming (10)
('q-programming-001', 'A variable is a named location that stores:', '["Code", "Data", "Functions", "Loops"]', 1, 'easy', 'programming', 0),
('q-programming-002', 'Which is true about O(n²) algorithm?', '["Very fast", "Quadratic complexity", "Linear time", "Constant time"]', 1, 'medium', 'programming', 0),
('q-programming-003', 'In Python, len([1,2,3]) returns:', '["List", "3", "None", "Error"]', 1, 'easy', 'programming', 0),
('q-programming-004', 'A loop that runs 10 times:', '["For i in range(10)", "While True", "Do-While", "Switch"]', 0, 'easy', 'programming', 0),
('q-programming-005', 'An array with 5 elements has indices:', '["0-4", "1-5", "0-5", "None"]', 0, 'easy', 'programming', 0),
('q-programming-006', 'Recursion means a function calls:', '["Another function", "Itself", "A method", "A class"]', 1, 'medium', 'programming', 0),
('q-programming-007', 'SQL SELECT returns:', '["Update", "Rows", "Delete", "Insert"]', 1, 'easy', 'programming', 0),
('q-programming-008', 'Binary search complexity is:', '["O(n)", "O(log n)", "O(n²)", "O(2^n)"]', 1, 'hard', 'programming', 0),
('q-programming-009', 'Stack is LIFO, meaning:', '["Last In First Out", "First In First Out", "Last In Last Out", "Largest Input First"]', 0, 'medium', 'programming', 0),
('q-programming-010', 'Git commit saves changes to:', '["Server", "Cloud", "Local repository", "Backup"]', 2, 'medium', 'programming', 0),

-- Thermodynamics (10)
('q-thermodynamics-001', 'Temperature is measure of:', '["Heat", "Cold", "Molecular kinetic energy", "Entropy"]', 2, 'easy', 'thermodynamics', 0),
('q-thermodynamics-002', 'First law of thermodynamics:', '["Energy conserved", "Entropy increases", "No perpetual motion", "Heat flows cold→hot"]', 0, 'medium', 'thermodynamics', 0),
('q-thermodynamics-003', 'Specific heat capacity unit is:', '["J", "J/(kg·K)", "W", "°C"]', 1, 'medium', 'thermodynamics', 0),
('q-thermodynamics-004', 'Absolute zero is:', ['"-273.15°C", "0°C", "100°C", "273.15 K"]', 0, 'easy', 'thermodynamics', 0),
('q-thermodynamics-005', 'Heat transfer by direct contact:', '["Radiation", "Conduction", "Convection", "Advection"]', 1, 'easy', 'thermodynamics', 0),
('q-thermodynamics-006', 'Entropy change indicates:', '["Heat", "Disorder", "Temperature", "Pressure"]', 1, 'hard', 'thermodynamics', 0),
('q-thermodynamics-007', 'Boiling point depends on:', '["Volume", "Pressure", "Color", "Density"]', 1, 'medium', 'thermodynamics', 0),
('q-thermodynamics-008', 'Latent heat is energy to:', '["Warm object", "Change state", "Mix liquids", "Evaporate water"]', 1, 'medium', 'thermodynamics', 0),
('q-thermodynamics-009', 'Efficiency = Output / Input × 100%. Maximum is:', '["< 100%", "100%", "> 100%", "Negative"]', 0, 'easy', 'thermodynamics', 0),
('q-thermodynamics-010', 'Thermal conductivity is lowest in:', '["Metals", "Gases", "Liquids", "Diamonds"]', 1, 'hard', 'thermodynamics', 0);
