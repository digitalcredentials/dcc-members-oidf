import re
import json

def parse_sql_to_json(sql_content):
    json_output = {}

    # Regex to match INSERT INTO statements, now correctly handling semicolons inside the values
    insert_pattern = re.compile(
        r"INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*(.*?)(?=\);)", 
        re.S
    )

    for match in insert_pattern.finditer(sql_content):
        table_name, columns, values_section = match.groups()
        columns = [col.strip() for col in columns.split(",")]
        # Check if the last character in values_section is not a closing parenthesis and semicolon, append it if missing
        if not values_section.endswith(")") :
            values_section += ")"

        # Now we can safely split the values, while considering only the final ");"
        value_tuples = re.findall(r"\((.*?)\)", values_section, re.S)

        for value in value_tuples:
            # Split values while handling commas inside quotes (e.g., string literals)
            parsed_values = re.split(r",\s*(?=(?:[^']*'[^']*')*[^']*$)", value)
            parsed_values = [val.strip().strip("'") for val in parsed_values]

            # Ensure the number of values matches the number of columns
            if len(parsed_values) != len(columns):
                raise ValueError(f"Column count and value count mismatch in table {table_name}")

            # Create the item dictionary with type indicators
            item = {}
            for col, val in zip(columns, parsed_values):
                if val.isdigit():  # If it's a number
                    item[col] = {"N": val}
                else:  # If it's a string
                    item[col] = {"S": val}

            db_key = f"db-{table_name}"
            if db_key not in json_output:
                json_output[db_key] = []

            json_output[db_key].append({"PutRequest": {"Item": item}})

    return json_output

# Read SQL file
with open("testdata.sql", "r", encoding="utf-8") as file:
    sql_content = file.read()

# Convert SQL to JSON
json_data = parse_sql_to_json(sql_content)

# Write to a JSON file
with open("testdata.json", "w", encoding="utf-8") as json_file:
    json.dump(json_data, json_file, indent=4)

print("Conversion completed. Output saved to testdata.json.")
