import csv
import zipfile
import io
import urllib.request
from qgis.core import Qgis, QgsMessageLog

# ============================ CONFIGURATION ============================
# Specify where you want the final dataset saved
OUTPUT_CSV = "C:/Users/Public/global_multi_source_communities.csv"

# The 8 target countries from your list
TARGET_COUNTRIES = ["ZM", "ZA", "PG", "SS", "ZW", "MW", "UG", "MG"]
# =======================================================================

def download_and_parse_country(country_code):
    """Downloads official zip matrix from the global gazetteer and parses features"""
    url = f"https://download.geonames.org/export/dump/{country_code}.zip"
    QgsMessageLog.logMessage(f"Downloading master text dump for {country_code}...", 'GlobalHarvester', Qgis.Info)
    print(f"[{country_code}] Downloading compressed spatial archive...")
    
    try:
        # Natively pipe the data stream via QGIS's active python environment
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=45) as response:
            zip_data = response.read()
            
        # Decompress in-memory to prevent disk writing permission bottlenecks
        with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
            txt_filename = f"{country_code}.txt"
            if txt_filename in z.namelist():
                txt_content = z.read(txt_filename).decode('utf-8')
                
                records = []
                lines = txt_content.strip().split('\n')
                
                for line in lines:
                    if not line:
                        continue
                    fields = line.split('\t')
                    if len(fields) < 15:
                        continue
                        
                    # Isolate Population Class 'P' (cities, towns, villages, compounds, neighborhoods)
                    if fields[6] == 'P':
                        records.append({
                            'Location_Name': fields[1],
                            'Country': country_code,
                            'Classification': fields[7], # Detailed class (PPL, PPLX, etc.)
                            'Latitude': float(fields[4]),
                            'Longitude': float(fields[5]),
                            'Source': 'Official Gazetteer',
                            'Alternate_Names': fields[3] if fields[3].strip() else "None Mined"
                        })
                return records
    except Exception as e:
        print(f"[!] Processing failed for {country_code}: {e}")
        QgsMessageLog.logMessage(f"Failed to pull {country_code}: {str(e)}", 'GlobalHarvester', Qgis.Warning)
    return []

def execute_qgis4_pipeline():
    master_records = []
    print("Initiating global offline matrix extractor inside QGIS 4.0...")
    
    for country in TARGET_COUNTRIES:
        country_data = download_and_parse_country(country)
        if country_data:
            master_records.extend(country_data)
            print(f"-> Successfully extracted {len(country_data)} micro-locations.")
            
    if master_records:
        headers = ['Location_Name', 'Country', 'Classification', 'Latitude', 'Longitude', 'Source', 'Alternate_Names']
        with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers)
            writer.writeheader()
            writer.writerows(master_records)
            
        success_msg = f"SUCCESS! Extracted {len(master_records)} unique multi-country locations directly to: {OUTPUT_CSV}"
        print("\n" + "="*75)
        print(success_msg)
        print("="*75)
        QgsMessageLog.logMessage(success_msg, 'GlobalHarvester', Qgis.Success)
    else:
        print("[!] Execution finished, but dataset compilation returned empty.")

# Execute the workflow natively inside your current canvas context
if __name__ == "__main__":
    execute_qgis4_pipeline()
