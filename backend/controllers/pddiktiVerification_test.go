package controllers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLookupPDDiktiStudentReportsNotAllowedForKnownNonAllowedStudent(t *testing.T) {
	const nim = "12345678"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if got := r.URL.Query().Get("nim"); got != nim {
			t.Fatalf("query nim = %q, want %q", got, nim)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"valid":false,"nama_pt":"Universitas Lain","message":"NIM terdaftar di Universitas Lain, bukan STT Nurul Fikri"}`))
	}))
	defer server.Close()

	t.Setenv("PDDIKTI_VERIFY_URL", server.URL+"/validate-nim")

	_, err := lookupPDDiktiStudent(context.Background(), nim)
	if !errors.Is(err, errPDDiktiNotAllowed) {
		t.Fatalf("lookupPDDiktiStudent error = %v, want %v", err, errPDDiktiNotAllowed)
	}
}

func TestLookupPDDiktiStudentKeepsUnknownNIMAsNotFound(t *testing.T) {
	const nim = "12345678"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"valid":false,"message":"NIM tidak ditemukan di PDDikti."}`))
	}))
	defer server.Close()

	t.Setenv("PDDIKTI_VERIFY_URL", server.URL+"/validate-nim")

	_, err := lookupPDDiktiStudent(context.Background(), nim)
	if !errors.Is(err, errPDDiktiNotFound) {
		t.Fatalf("lookupPDDiktiStudent error = %v, want %v", err, errPDDiktiNotFound)
	}
}

func TestLookupPDDiktiStudentMapsAcademicMetadata(t *testing.T) {
	const nim = "0110224237"
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"nim":"0110224237",
			"nama_mahasiswa":"Mahasiswa Contoh",
			"jenis_kelamin":"L",
			"nama_pt":"Sekolah Tinggi Teknologi Terpadu Nurul Fikri",
			"tanggal_masuk":"2024-09-01",
			"jenjang":"S1",
			"nama_prodi":"Teknik Informatika",
			"status_mahasiswa":"Aktif"
		}`))
	}))
	defer server.Close()

	t.Setenv("PDDIKTI_VERIFY_URL", server.URL+"/validate-nim")

	student, err := lookupPDDiktiStudent(context.Background(), nim)
	if err != nil {
		t.Fatalf("lookupPDDiktiStudent error: %v", err)
	}
	if student.Gender != "Laki-laki" || student.EntryDate != "2024-09-01" || student.EducationLevel != "S1" || student.StudentStatus != "Aktif" {
		t.Fatalf("student metadata = %#v", student)
	}
}
