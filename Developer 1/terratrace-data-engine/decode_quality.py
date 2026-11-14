import numpy as np

# Your actual QC values
qc_values = np.array([65, 81, 145], dtype=np.uint8)

print("MODIS QC_DAY DECODER")
print("=" * 60)

for value in qc_values:

    # Extract individual two-bit fields
    mandatory_qa = value & 0b00000011
    data_quality = (value >> 2) & 0b00000011
    emissivity_error = (value >> 4) & 0b00000011
    lst_error = (value >> 6) & 0b00000011

    print(f"\nRaw QC value: {value}")
    print(f"Binary: {value:08b}")

    print("Mandatory QA:", format(mandatory_qa, "02b"))
    print("Data quality:", format(data_quality, "02b"))
    print("Emissivity error:", format(emissivity_error, "02b"))
    print("LST error:", format(lst_error, "02b"))

    # Interpret mandatory QA
    mandatory_labels = {
        0: "Good quality",
        1: "Other quality - examine detailed QA",
        2: "LST not produced due to cloud",
        3: "LST not produced for other reasons"
    }

    # Interpret error fields
    emissivity_labels = {
        0: "<= 0.01",
        1: "<= 0.02",
        2: "<= 0.04",
        3: "> 0.04"
    }

    lst_error_labels = {
        0: "<= 1 K",
        1: "<= 2 K",
        2: "<= 3 K",
        3: "> 3 K"
    }

    print("Interpretation:")
    print("  Mandatory QA:", mandatory_labels[mandatory_qa])
    print("  Emissivity error:", emissivity_labels[emissivity_error])
    print("  LST error:", lst_error_labels[lst_error])

    print("  Data quality:", 
          "Good" if data_quality == 0 else "Other / TBD")
