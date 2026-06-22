from flask import Flask, request, jsonify
from pddiktipy import api
import logging
import os

logging.basicConfig(level=logging.INFO)
app = Flask(__name__)

ALLOWED_PT = (
    os.environ.get("PDDIKTI_ALLOWED_INSTITUTION")
    or os.environ.get("PDDIKTI_ALLOWED_INSTITUTIONS", "").split(",")[0]
    or "SEKOLAH TINGGI TEKNOLOGI TERPADU NURUL FIKRI"
).upper()

@app.route("/validate-nim/", methods=["GET"])
def validate_nim():
    nim = request.args.get("nim", "").strip()

    if not nim:
        return jsonify({"valid": False, "message": "NIM tidak boleh kosong"}), 400

    try:
        with api() as client:
            result = client.search_mahasiswa(nim)

        if not result:
            return jsonify({"valid": False, "message": "NIM Kampus STT-NF tidak ditemukan di PDDikti"})

        # search_mahasiswa returns: id, nama, nim, nama_pt, singkatan_pt, nama_prodi
        # We need to find the matching student, then call get_detail_mhs for full data
        search_data = result if isinstance(result, list) else result.get("data") or result.get("mahasiswa", [])
        if isinstance(search_data, dict):
            search_data = [search_data]

        normalized_nim = nim.upper()
        for mhs in search_data:
            if str(mhs.get("nim", "")).upper() == normalized_nim:
                nama_pt = mhs.get("nama_pt", "").upper()
                if ALLOWED_PT in nama_pt:
                    # Found a matching student at the allowed institution.
                    # Now fetch detailed data using the student's unique ID.
                    detail = _fetch_detail(client if hasattr(client, 'get_detail_mhs') else None, mhs)

                    return jsonify({
                        "valid": True,
                        "nim": detail.get("nim") or mhs.get("nim"),
                        "nama": detail.get("nama") or mhs.get("nama"),
                        "nama_pt": detail.get("nama_pt") or mhs.get("nama_pt"),
                        "singkatan_pt": detail.get("singkatan_pt") or mhs.get("singkatan_pt") or mhs.get("sinkatan_pt", "STT-NF"),
                        "prodi": detail.get("prodi") or detail.get("nama_prodi") or mhs.get("nama_prodi"),
                        "jenis_kelamin": _normalize_gender(detail.get("jenis_kelamin", "")),
                        "jenjang": detail.get("jenjang", ""),
                        "tanggal_masuk": detail.get("tanggal_masuk", ""),
                        "tahun_masuk": detail.get("tahun_masuk", ""),
                        "jenis_daftar": detail.get("jenis_daftar", ""),
                        "status_saat_ini": detail.get("status_saat_ini", ""),
                        "message": "Terverifikasi sebagai mahasiswa STT Nurul Fikri"
                    })
                else:
                    return jsonify({
                        "valid": False,
                        "nim": mhs.get("nim") or nim,
                        "nama": mhs.get("nama"),
                        "nama_pt": mhs.get("nama_pt"),
                        "prodi": mhs.get("nama_prodi"),
                        "message": "NIM valid, tapi bukan mahasiswa STT Nurul Fikri."
                    })

        return jsonify({"valid": False, "message": "NIM tidak ditemukan atau tidak sesuai"})

    except Exception as e:
        logging.error(f"Error validasi NIM {nim}: {e}")
        return jsonify({"valid": False, "message": "Gagal menghubungi PDDikti, coba lagi nanti"}), 503


def _fetch_detail(client, mhs):
    """Fetch detailed student data using get_detail_mhs if available."""
    student_id = mhs.get("id", "")
    if not student_id or client is None:
        return mhs

    try:
        # Re-open a fresh client for the detail call since the context
        # manager may have been exited after search_mahasiswa.
        with api() as detail_client:
            detail = detail_client.get_detail_mhs(student_id)
        if detail and isinstance(detail, dict):
            logging.info(f"PDDikti detail data fetched for id={student_id}")
            return detail
    except Exception as e:
        logging.warning(f"Failed to fetch detail for id={student_id}: {e}")

    return mhs


def _normalize_gender(value):
    """Normalize gender value from PDDikti (L/P) to human-readable form."""
    v = str(value).strip().upper()
    if v in ("L", "LAKI-LAKI", "LAKI LAKI", "MALE"):
        return "Laki-laki"
    if v in ("P", "PEREMPUAN", "FEMALE"):
        return "Perempuan"
    return value


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_PORT", "5001"))
    try:
        from waitress import serve
        logging.info(f"Starting production server (Waitress) on port {port}...")
        serve(app, host="0.0.0.0", port=port)
    except ImportError:
        logging.warning("Waitress not installed. Falling back to development Flask server...")
        app.run(host="0.0.0.0", port=port, debug=False)
