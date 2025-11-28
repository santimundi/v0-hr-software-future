from uuid import UUID
from src.agents.db_agent.state import State, SummaryOutput
from src.core.file_readers import read_pdf, read_text_file, read_excel
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
from src.agents.db_agent.prompts import *
from src.agents.db_agent.tools import insert_into_table, upload_to_private_bucket, get_employee_uuid_by_id
from datetime import datetime, timezone


class DB_Node:
    def __init__(self, llm):
        self.llm = llm 

    

    def read_file(self, state: State):
        filename = state["filename"]
        file_bytes = state["file_bytes"]

        lower = filename.lower()

        if lower.endswith(".pdf"):
            response = read_pdf(file_bytes)
        elif lower.endswith(".txt") or lower.endswith(".md"):
            response = read_text_file(file_bytes)
        elif lower.endswith(".xlsx") or lower.endswith(".xlsm") or lower.endswith(".xls"):
            response = read_excel(file_bytes)
        else:
            response = {
                "kind": "unknown",
                "content_text": "",
                "content_structured": None,
                "warnings": ["File extension not recognized"],
            }

        content_text = response.get("content_text", "")
        content_structured = response.get("content_structured", None)
        warnings = response.get("warnings", [])

        return {
            "messages": [AIMessage(content=content_text)],
            "content": content_text,
            "content_structured": content_structured,
            "warnings": warnings,
        }

    def upload_to_storage(self, state: State):
        filename = state["filename"]
        file_bytes = state["file_bytes"]
        employee_id = state["employee_id"]

        response = upload_to_private_bucket(employee_id, filename, file_bytes)

        file_url = response.get("path", None)
        

        return {
            "messages": [AIMessage(content=f"File uploaded to storage: {file_url}")],
            "file_url": file_url,
        }

    
    def get_employee_uuid(self, state: State):
        employee_id = state["employee_id"]
        
        # Call the tool to query the employees table
        result = get_employee_uuid_by_id(employee_id)
        employee_uuid = str(result.get("uuid")) if result.get("success") and result.get("uuid") else None
        
        if not employee_uuid:
            print(f"Error retrieving employee UUID: {result.get('error', 'Unknown error')}")
        
        # Print UUID to stdout
        print(f"\n======================= Employee UUID Retrieved =============================")
        print(f"Employee ID: {employee_id}")
        print(f"Employee UUID: {employee_uuid}")
        print("========================================================")
        
        if employee_uuid:
            return {
                "messages": [AIMessage(content=f"Employee UUID retrieved: {employee_uuid}")],
                "employee_uuid": employee_uuid,
            }
        else:
            return {
                "messages": [AIMessage(content=f"Employee with ID {employee_id} not found in database")],
                "employee_uuid": None,
            }


    async def generate_summary(self, state: State):
        file_content = state["content"]
        filename = state.get("filename", "")

        llm_with_structured_output = self.llm.with_structured_output(SummaryOutput)

        messages = [
            SystemMessage(content=DB_AGENT_GENERATE_SUMMARY_PROMPT),
            HumanMessage(content=f"File Content: {file_content}, Filename: {filename}"),
        ]
        
        response = await llm_with_structured_output.ainvoke(messages)
        
        return {
            "messages": [AIMessage(content=f"Generated title: {response.title}, Summary: {response.ai_summary}")],
            "title": response.title,
            "ai_summary": response.ai_summary,
        }
    
    

    def update_table(self, state: State):
        row_details = {
            "owner_employee_id": state["employee_uuid"],
            "content": state["content"],
            "content_structured": state["content_structured"],
            "uploaded_by": state["employee_name"],
            "title": state["title"],
            "ai_summary": state["ai_summary"],
            "file_url": state["file_url"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        response = insert_into_table("documents_1", row_details)
        
        print(f"-------------------Insert into table response:-------------------")
        print(response)
        print(f"----------------------------------------------------------")


        if response.get("success", False):
            return {
                "messages": [AIMessage(content=f"Document inserted into table: {response.get('id', None)}")],
                "response": {
                    "status_code": 200,
                    "message": "Document successfully inserted",
                },
            }
        else:
            error = response.get("error", "Unknown error")
            # Determine appropriate error code based on error type
            if "not found" in error.lower() or "does not exist" in error.lower():
                status_code = 404
            elif "validation" in error.lower() or "invalid" in error.lower() or "constraint" in error.lower():
                status_code = 400
            else:
                status_code = 500
            
            return {
                "messages": [AIMessage(content=f"Error inserting document into table: {error}")],
                "response": {
                    "status_code": status_code,
                    "message": f"Failed to insert document: {error}",
                },
            }
        