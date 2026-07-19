import os
from supabase import create_client, Client
from datetime import datetime
import uuid

# --- In-Memory Mock Store for Testing without Supabase ---
MOCK_DB = []
# ---------------------------------------------------------

supabase: Client = None

def init_supabase():
    global supabase
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if url and key:
        try:
            supabase = create_client(url, key)
            print("Supabase initialized successfully.")
        except Exception as e:
            print(f"Supabase initialization failed: {e}. Using mock DB.")
    else:
        print("SUPABASE_URL or SUPABASE_KEY not provided, using mock DB.")

def save_receipt(data: dict, image_url: str):
    if not supabase:
        # Fallback to Mock DB
        receipt_id = str(uuid.uuid4())
        receipt_data = {
            "id": receipt_id,
            "item": data.get("item", ""),
            "vendor": data.get("vendor", ""),
            "spec": data.get("spec", ""),
            "quantity": data.get("quantity", ""),
            "driver": data.get("driver", ""),
            "process": data.get("process", ""),
            "imageUrl": image_url,
            "createdAt": datetime.now().isoformat()
        }
        MOCK_DB.append(receipt_data)
        return receipt_data
    
    receipt_data = {
        "item": data.get("item", ""),
        "vendor": data.get("vendor", ""),
        "spec": data.get("spec", ""),
        "quantity": data.get("quantity", ""),
        "driver": data.get("driver", ""),
        "process": data.get("process", ""),
        "imageUrl": image_url
        # createdAt is default now() in DB
    }
    
    response = supabase.table('receipts').insert(receipt_data).execute()
    if response.data:
        return response.data[0]
    return None

def get_receipts(process=None, item=None, date_from=None, date_to=None):
    if not supabase:
        # Fallback to Mock DB
        results = MOCK_DB.copy()
        if process:
            results = [r for r in results if r.get("process") == process]
        if item:
            results = [r for r in results if item.lower() in r.get("item", "").lower()]
        results.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
        return results
        
    query = supabase.table('receipts').select('*')
    
    if process:
        query = query.eq('process', process)
    if item:
        query = query.ilike('item', f'%{item}%')
        
    # Order by createdAt descending
    query = query.order('createdAt', desc=True)
    
    response = query.execute()
    return response.data

def get_receipt(receipt_id: str):
    if not supabase:
        for r in MOCK_DB:
            if r["id"] == receipt_id:
                return r
        return None
        
    response = supabase.table('receipts').select('*').eq('id', receipt_id).execute()
    if response.data and len(response.data) > 0:
        return response.data[0]
    return None

def delete_receipt(receipt_id: str):
    if not supabase:
        global MOCK_DB
        initial_len = len(MOCK_DB)
        MOCK_DB = [r for r in MOCK_DB if r["id"] != receipt_id]
        return len(MOCK_DB) < initial_len
        
    response = supabase.table('receipts').delete().eq('id', receipt_id).execute()
    # Supabase response.data contains deleted rows if any
    if response.data and len(response.data) > 0:
        return True
    return False

def upload_image(file_bytes: bytes, filename: str, content_type: str, request=None):
    if not supabase:
        # Save to local uploads directory
        unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
        filepath = os.path.join(os.path.dirname(__file__), '..', 'uploads', unique_filename)
        with open(filepath, 'wb') as f:
            f.write(file_bytes)
            
        if request:
            return str(request.url_for('uploads', path=unique_filename))
        return f"/uploads/{unique_filename}"
        
    unique_filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{filename}"
    
    # Upload to Supabase Storage
    # Bucket name is 'receipts'
    res = supabase.storage.from_("receipts").upload(
        path=unique_filename,
        file=file_bytes,
        file_options={"content-type": content_type}
    )
    
    # Get public URL
    public_url = supabase.storage.from_("receipts").get_public_url(unique_filename)
    return public_url
