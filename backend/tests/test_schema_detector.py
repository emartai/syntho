import pytest

from app.services.schema_detector import detect_schema, SchemaDetectionError


def test_detect_schema_csv_success():
    csv_bytes = b"id,amount,created_at,is_active,category,description\n1,10.5,2025-01-01,true,retail,first\n2,20.0,2025-01-02,false,retail,second\n3,30.5,2025-01-03,true,retail,third\n"

    schema = detect_schema(csv_bytes, "text/csv")

    assert schema["row_count"] == 3
    assert schema["column_count"] == 6
    assert schema["file_size_bytes"] == len(csv_bytes)

    by_name = {c["name"]: c for c in schema["columns"]}
    assert by_name["amount"]["data_type"] == "numeric"
    assert by_name["amount"]["stats"]["min"] == 10.5
    assert by_name["amount"]["stats"]["max"] == 30.5
    assert by_name["is_active"]["data_type"] == "boolean"
    assert by_name["created_at"]["data_type"] == "datetime"
    assert by_name["category"]["data_type"] == "categorical"
    assert "top_3_values" in by_name["category"]["stats"]


def test_detect_schema_rejects_zero_rows():
    with pytest.raises(SchemaDetectionError, match="0 rows"):
        detect_schema(b"id,name\n", "text/csv")


def test_detect_schema_rejects_too_many_columns():
    headers = ",".join([f"c{i}" for i in range(1001)])
    row = ",".join(["1" for _ in range(1001)])
    payload = f"{headers}\n{row}\n".encode("utf-8")

    with pytest.raises(SchemaDetectionError, match="too many columns"):
        detect_schema(payload, "text/csv")


def test_detect_schema_rejects_empty_file():
    with pytest.raises(SchemaDetectionError, match="empty"):
        detect_schema(b"", "text/csv")
