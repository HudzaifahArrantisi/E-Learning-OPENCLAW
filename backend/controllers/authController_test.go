package controllers

import "testing"

func TestNormalizeLoginIdentifier(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{name: "NIM", input: "2310112345", want: "2310112345"},
		{name: "NIP", input: "1987654321", want: "1987654321"},
		{name: "username", input: "bem-sttnf", want: "bem-sttnf"},
		{name: "institutional email", input: "2310112345@nurulfikri.ac.id", want: "2310112345@nurulfikri.ac.id"},
		{name: "non student email", input: "admin@example.com", want: "admin@example.com"},
		{name: "surrounding spaces", input: " 2310112345 ", want: "2310112345"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeLoginIdentifier(tt.input); got != tt.want {
				t.Fatalf("normalizeLoginIdentifier(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestIsValidLoginInput(t *testing.T) {
	if !isValidLoginInput("2310112345@nurulfikri.ac.id", "password") {
		t.Fatal("expected valid credentials input")
	}
	if !isValidLoginInput("kemahasiswaan", "password") {
		t.Fatal("expected bare account identifier to be valid")
	}
	if !isValidLoginInput("bem-sttnf", "password") {
		t.Fatal("expected role username to be valid")
	}
	if !isValidLoginInput("invalid-email", "password") {
		t.Fatal("expected bare identifier to be valid")
	}
	if !isValidLoginInput("0110224237", "password") {
		t.Fatal("expected NIM starting with zero to be valid")
	}
	if !isValidLoginInput("0110224237@nurulfikri.ac.id", "password") {
		t.Fatal("expected institutional email with zero-prefixed NIM to be valid")
	}
	if isValidLoginInput("user@", "password") {
		t.Fatal("expected malformed email to be rejected")
	}
	if isValidLoginInput("user@example.com", "") {
		t.Fatal("expected empty password to be rejected")
	}
}

func TestGetLoginAccountIdentifier(t *testing.T) {
	tests := []struct {
		name      string
		input     string
		want      string
		wantAllow bool
	}{
		{name: "bare NIM", input: "2310112345", want: "2310112345", wantAllow: true},
		{name: "institutional email uses local part", input: "2310112345@nurulfikri.ac.id", want: "2310112345", wantAllow: true},
		{name: "institutional email trims spaces", input: " 2310112345@nurulfikri.ac.id ", want: "2310112345", wantAllow: true},
		{name: "NIM starting with zero", input: "0110224237", want: "0110224237", wantAllow: true},
		{name: "institutional email with zero-prefixed NIM", input: "0110224237@nurulfikri.ac.id", want: "0110224237", wantAllow: true},
		{name: "external email only matches exact email", input: "admin@example.com", want: "admin@example.com", wantAllow: false},
		{name: "empty identifier", input: " ", want: "", wantAllow: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, gotAllow := getLoginAccountIdentifier(tt.input)
			if got != tt.want || gotAllow != tt.wantAllow {
				t.Fatalf("getLoginAccountIdentifier(%q) = (%q, %v), want (%q, %v)", tt.input, got, gotAllow, tt.want, tt.wantAllow)
			}
		})
	}
}

func TestStudentVerificationHelpers(t *testing.T) {
	nim, ok := normalizeStudentNIM(" 0110224237 ")
	if !ok || nim != "0110224237" {
		t.Fatalf("normalizeStudentNIM returned (%q, %v), want (0110224237, true)", nim, ok)
	}

	if _, ok := normalizeStudentNIM("bad-nim!"); ok {
		t.Fatal("expected invalid NIM with punctuation to be rejected")
	}

	if !isAllowedInstitution("Sekolah Tinggi Teknologi Terpadu Nurul Fikri") {
		t.Fatal("expected STT Terpadu Nurul Fikri to be allowed")
	}

	if isAllowedInstitution("Universitas Lain") {
		t.Fatal("expected unrelated institution to be rejected")
	}
}

func TestStudentVerificationToken(t *testing.T) {
	student := pddiktiStudent{
		NIM:          "0110224237",
		Name:         "Mahasiswa Contoh",
		Institution:  "Sekolah Tinggi Teknologi Terpadu Nurul Fikri",
		StudyProgram: "Teknik Informatika",
	}

	token, err := issueStudentVerificationToken(student)
	if err != nil {
		t.Fatalf("issueStudentVerificationToken error: %v", err)
	}

	got, ok := validateStudentVerificationToken(token, student.NIM)
	if !ok {
		t.Fatal("expected token to validate")
	}
	if got.NIM != student.NIM || got.Name != student.Name || got.Institution != student.Institution {
		t.Fatalf("validated student = %#v, want %#v", got, student)
	}

	if _, ok := validateStudentVerificationToken(token, "0110224999"); ok {
		t.Fatal("expected token to reject mismatched NIM")
	}
}
